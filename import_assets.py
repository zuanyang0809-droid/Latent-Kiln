import os
import shutil
import json
import csv
import re
from pathlib import Path

# ================= 配置区域 =================

SOURCE_ROOT = r"C:\GSD\SCI\Final\Final_Data_Packages"
CSV_PATH = Path(r"C:\GSD\SCI\Final\web_database.csv")

DIR_NAME_ORIGINAL = "Photos_NoBG"
DIR_NAME_DEPTH = "Depth"
DIR_NAME_PARTS = "Parts"

PROJECT_ROOT = Path(__file__).resolve().parent

TARGET_ROOT = PROJECT_ROOT / "public" / "assets" / "images"
TARGET_ORIGINAL = TARGET_ROOT / "original"
TARGET_DEPTH = TARGET_ROOT / "depth"
TARGET_PARTS_NECK = TARGET_ROOT / "parts" / "neck"
TARGET_PARTS_BODY = TARGET_ROOT / "parts" / "body"
TARGET_PARTS_BASE = TARGET_ROOT / "parts" / "base"

DB_OUTPUT_PATH = PROJECT_ROOT / "frontend_master_db.json"

# ==========================================

def clean_string(name):
    clean = re.sub(r'[^\w]', '_', name).strip('_')
    clean = re.sub(r'_+', '_', clean)
    return clean

def load_csv_data(csv_path):
    data_map = {}
    if not csv_path.exists():
        return data_map
    try:
        with open(csv_path, 'r', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)
            for row in reader:
                filename = row.get('filename', '')
                if not filename: continue
                key = Path(filename).stem.lower().strip()
                try:
                    tx = float(row.get('x', 0))
                    ty = float(row.get('y', 0))
                except ValueError:
                    tx, ty = 0, 0
                data_map[key] = {
                    "region": row.get('region', 'Unknown'),
                    "x": tx,
                    "y": ty
                }
    except Exception:
        pass
    return data_map

def ensure_clean_dir(directory):
    if directory.exists():
        shutil.rmtree(directory)
    directory.mkdir(parents=True, exist_ok=True)

# === 新增：建立文件索引 ===
def build_file_index(directory):
    """
    遍历指定目录，建立一个字典：
    Key: 文件名(不带后缀，小写)
    Value: 文件的完整路径
    """
    index = {}
    print(f"🔍 正在索引文件夹: {directory.name} ...")
    if not directory.exists():
        print(f"⚠️ 警告: 文件夹不存在 {directory}")
        return index

    count = 0
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.lower().endswith(('.png', '.jpg', '.jpeg')):
                # 获取文件名作为 Key (比如 'main-image_35')
                stem = Path(file).stem.lower().strip()
                # 记录完整路径
                index[stem] = Path(root) / file
                count += 1
    print(f"   - 索引了 {count} 个文件")
    return index

def main():
    print("🚀 开始全量同步 (忽略文件夹结构差异)...")

    csv_data = load_csv_data(CSV_PATH)
    path_root = Path(SOURCE_ROOT)
    
    # 1. 建立 Depth 和 Parts 的索引 (这就是魔法所在！)
    # 不管深度图在 Depth/test 还是 Depth/train，只要名字对，就能找到
    depth_index = build_file_index(path_root / DIR_NAME_DEPTH)
    
    parts_neck_index = build_file_index(path_root / DIR_NAME_PARTS / "neck")
    parts_body_index = build_file_index(path_root / DIR_NAME_PARTS / "body")
    parts_base_index = build_file_index(path_root / DIR_NAME_PARTS / "base")

    # 2. 准备目录
    path_original = path_root / DIR_NAME_ORIGINAL
    if not path_original.exists():
        print(f"❌ 错误：找不到源图片文件夹: {path_original}")
        return

    print("🧹 清理 public 文件夹...")
    ensure_clean_dir(TARGET_ORIGINAL)
    ensure_clean_dir(TARGET_DEPTH)
    ensure_clean_dir(TARGET_PARTS_NECK)
    ensure_clean_dir(TARGET_PARTS_BODY)
    ensure_clean_dir(TARGET_PARTS_BASE)

    db_entries = []
    seen_ids = set()
    stats = {"processed": 0, "kept": 0, "dropped_no_depth": 0}

    # 3. 遍历原图
    for root, dirs, files in os.walk(path_original):
        # 仍然计算路径前缀，为了生成 ID
        rel_path_obj = Path(root).relative_to(path_original)
        rel_path_str = str(rel_path_obj)
        if rel_path_str == ".": path_prefix = ""
        else: path_prefix = clean_string(rel_path_str)

        for file in files:
            if file.lower().endswith(('.png', '.jpg', '.jpeg')):
                stats["processed"] += 1
                
                # 获取核心文件名 (Key)
                file_stem = Path(file).stem.lower().strip()

                # === 核心修改：通过索引查找 Depth ===
                found_depth_src = depth_index.get(file_stem)
                
                if not found_depth_src:
                    # 如果在 Depth 文件夹的任何角落都找不到同名文件 -> 丢弃
                    # print(f"丢弃: {file} (未找到对应 Depth)") # 调试用
                    stats["dropped_no_depth"] += 1
                    continue
                # ===================================

                # A. CSV 匹配
                meta = csv_data.get(file_stem)
                if meta:
                    region = meta['region']
                    coord = {"x": meta['x'], "y": meta['y']}
                else:
                    folder_lower = os.path.basename(root).lower()
                    if 'africa' in folder_lower: region = 'Africa'
                    elif 'asia' in folder_lower: region = 'East Asia'
                    elif 'europe' in folder_lower: region = 'Europe'
                    elif 'americas' in folder_lower: region = 'Americas'
                    elif 'middle' in folder_lower: region = 'Middle East'
                    else: region = 'Unknown'
                    coord = {"x": 0, "y": 0}

                # B. 生成 ID
                clean_name = clean_string(Path(file).stem)
                if path_prefix: new_id = f"{region}_{path_prefix}_{clean_name}"
                else: new_id = f"{region}_{clean_name}"

                unique_id = new_id
                counter = 1
                while unique_id in seen_ids:
                    unique_id = f"{new_id}_{counter}"
                    counter += 1
                seen_ids.add(unique_id)

                extension = Path(file).suffix
                new_filename = f"{unique_id}{extension}"

                # C. 复制 Original
                src_orig = Path(root) / file
                dst_orig = TARGET_ORIGINAL / new_filename
                shutil.copy2(src_orig, dst_orig)

                # D. 复制 Depth (使用从索引里找到的路径)
                dst_depth = TARGET_DEPTH / new_filename
                shutil.copy2(found_depth_src, dst_depth)
                final_depth_url = f"/assets/images/depth/{new_filename}"

                # E. 查找 Parts (使用索引查找)
                parts_urls = {"neck": "", "body": "", "base": ""}
                
                # Neck
                if file_stem in parts_neck_index:
                    shutil.copy2(parts_neck_index[file_stem], TARGET_PARTS_NECK / new_filename)
                    parts_urls["neck"] = f"/assets/images/parts/neck/{new_filename}"
                
                # Body
                if file_stem in parts_body_index:
                    shutil.copy2(parts_body_index[file_stem], TARGET_PARTS_BODY / new_filename)
                    parts_urls["body"] = f"/assets/images/parts/body/{new_filename}"
                
                # Base
                if file_stem in parts_base_index:
                    shutil.copy2(parts_base_index[file_stem], TARGET_PARTS_BASE / new_filename)
                    parts_urls["base"] = f"/assets/images/parts/base/{new_filename}"

                # F. 写入
                entry = {
                    "id": unique_id,
                    "region": region,
                    "period": "Unknown",
                    "globe_coordinates": coord,
                    "assets": {
                        "image_url": f"/assets/images/original/{new_filename}",
                        "depth_url": final_depth_url,
                        "parts": parts_urls
                    }
                }
                db_entries.append(entry)
                stats["kept"] += 1

    print("-" * 30)
    print(f"📊 统计结果:")
    print(f"   - 扫描原图: {stats['processed']}")
    print(f"   - ❌ 无Depth丢弃: {stats['dropped_no_depth']}")
    print(f"   - ✅ 最终保留: {stats['kept']}")
    
    with open(DB_OUTPUT_PATH, 'w', encoding='utf-8') as f:
        json.dump(db_entries, f, ensure_ascii=False, indent=2)
        
    print(f"📝 数据库已生成: {DB_OUTPUT_PATH}")

if __name__ == "__main__":
    main()