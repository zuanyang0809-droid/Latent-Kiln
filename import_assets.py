import os
import shutil
import json
import csv
import re
import hashlib  # <--- 新增：用于计算文件指纹
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

def calculate_file_hash(filepath):
    """
    计算文件的 MD5 哈希值（数字指纹）。
    如果两张图内容完全一样，哈希值就一样。
    """
    hasher = hashlib.md5()
    with open(filepath, 'rb') as f:
        # 分块读取，防止大文件撑爆内存
        buf = f.read(65536)
        while len(buf) > 0:
            hasher.update(buf)
            buf = f.read(65536)
    return hasher.hexdigest()

def clean_string(name):
    clean = re.sub(r'[^\w]', '_', name).strip('_')
    clean = re.sub(r'_+', '_', clean)
    return clean

def load_csv_data(csv_path):
    data_map = {}
    if not csv_path.exists():
        print(f"❌ 严重错误: 找不到 CSV 文件: {csv_path}")
        return data_map

    print(f"📖 正在读取 CSV: {csv_path}")
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
                
                entry = {
                    "region": row.get('region', 'Unknown'),
                    "x": tx,
                    "y": ty
                }
                
                if key not in data_map:
                    data_map[key] = []
                data_map[key].append(entry)
                
    except Exception as e:
        print(f"❌ 读取 CSV 失败: {e}")
    
    print(f"✅ CSV 读取完毕，包含 {len(data_map)} 个唯一文件名索引。")
    return data_map

def ensure_clean_dir(directory):
    if directory.exists():
        shutil.rmtree(directory)
    directory.mkdir(parents=True, exist_ok=True)

def build_file_index(directory):
    index = {}
    if not directory.exists():
        return index
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.lower().endswith(('.png', '.jpg', '.jpeg')):
                stem = Path(file).stem.lower().strip()
                index[stem] = Path(root) / file
    return index

def determine_region_from_folder(folder_name):
    lower = folder_name.lower()
    if 'africa' in lower: return 'Africa'
    if 'east asia' in lower or 'east_asia' in lower: return 'East Asia'
    if 'asia' in lower: return 'East Asia'
    if 'europe' in lower: return 'Europe'
    if 'americas' in lower or 'america' in lower: return 'Americas'
    if 'middle' in lower: return 'Middle East'
    return 'Unknown'

def main():
    print("🚀 开始全量同步 (基于内容去重 + CSV 匹配)...")

    # 1. 读取 CSV
    csv_data_map = load_csv_data(CSV_PATH)

    # 2. 建立辅助索引
    path_root = Path(SOURCE_ROOT)
    depth_index = build_file_index(path_root / DIR_NAME_DEPTH)
    parts_neck_index = build_file_index(path_root / DIR_NAME_PARTS / "neck")
    parts_body_index = build_file_index(path_root / DIR_NAME_PARTS / "body")
    parts_base_index = build_file_index(path_root / DIR_NAME_PARTS / "base")

    # 3. 准备目录
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
    
    # === 新增：用于记录已处理图片的哈希值 ===
    seen_image_hashes = set()
    
    stats = {
        "processed": 0, 
        "kept": 0, 
        "dropped_no_depth": 0, 
        "dropped_content_duplicate": 0, # 新增统计
        "exact_match": 0, 
        "fallback_coord": 0
    }

    # 4. 遍历原图
    for root, dirs, files in os.walk(path_original):
        rel_path_obj = Path(root).relative_to(path_original)
        rel_path_str = str(rel_path_obj)
        if rel_path_str == ".": path_prefix = ""
        else: path_prefix = clean_string(rel_path_str)

        current_folder_region = determine_region_from_folder(os.path.basename(root))

        for file in files:
            if file.lower().endswith(('.png', '.jpg', '.jpeg')):
                stats["processed"] += 1
                
                src_orig = Path(root) / file
                file_stem = Path(file).stem.lower().strip()

                # --- 0. 核心新增：基于图片内容去重 ---
                # 计算当前图片的指纹
                file_hash = calculate_file_hash(src_orig)
                
                if file_hash in seen_image_hashes:
                    # 指纹已存在，说明是完全一样的图片
                    stats["dropped_content_duplicate"] += 1
                    # print(f"⚠️ 发现内容重复图片，跳过: {file}") # 调试用
                    continue
                
                # 记录新指纹
                seen_image_hashes.add(file_hash)
                # ----------------------------------

                # --- 1. 必须有 Depth ---
                found_depth_src = depth_index.get(file_stem)
                if not found_depth_src:
                    stats["dropped_no_depth"] += 1
                    continue

                # --- 2. 匹配 CSV ---
                matched_csv_entry = None
                potential_entries = csv_data_map.get(file_stem, [])

                if len(potential_entries) == 1:
                    matched_csv_entry = potential_entries[0]
                elif len(potential_entries) > 1:
                    for entry in potential_entries:
                        if entry['region'] == current_folder_region:
                            matched_csv_entry = entry
                            break
                    if not matched_csv_entry:
                        matched_csv_entry = potential_entries[0]
                
                if matched_csv_entry:
                    region = matched_csv_entry['region']
                    coord = {"x": matched_csv_entry['x'], "y": matched_csv_entry['y']}
                    stats["exact_match"] += 1
                else:
                    region = current_folder_region
                    coord = {"x": 0, "y": 0}
                    stats["fallback_coord"] += 1

                # --- 3. 生成 ID ---
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

                # --- 4. 复制文件 ---
                dst_orig = TARGET_ORIGINAL / new_filename
                shutil.copy2(src_orig, dst_orig)

                dst_depth = TARGET_DEPTH / new_filename
                shutil.copy2(found_depth_src, dst_depth)
                final_depth_url = f"/assets/images/depth/{new_filename}"

                # --- 5. 查找 Parts ---
                parts_urls = {"neck": "", "body": "", "base": ""}
                
                if file_stem in parts_neck_index:
                    shutil.copy2(parts_neck_index[file_stem], TARGET_PARTS_NECK / new_filename)
                    parts_urls["neck"] = f"/assets/images/parts/neck/{new_filename}"
                
                if file_stem in parts_body_index:
                    shutil.copy2(parts_body_index[file_stem], TARGET_PARTS_BODY / new_filename)
                    parts_urls["body"] = f"/assets/images/parts/body/{new_filename}"
                
                if file_stem in parts_base_index:
                    shutil.copy2(parts_base_index[file_stem], TARGET_PARTS_BASE / new_filename)
                    parts_urls["base"] = f"/assets/images/parts/base/{new_filename}"

                # --- 6. 写入 ---
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
    print(f"   - 🚫 无Depth丢弃: {stats['dropped_no_depth']}")
    print(f"   - ✂️  内容重复丢弃: {stats['dropped_content_duplicate']} (MD5 去重)")
    print(f"   - ✅ 最终保留: {stats['kept']}")
    print(f"     ----------------")
    print(f"     - 精准匹配 CSV: {stats['exact_match']}")
    print(f"     - 未匹配 CSV (0,0): {stats['fallback_coord']}")
    
    with open(DB_OUTPUT_PATH, 'w', encoding='utf-8') as f:
        json.dump(db_entries, f, ensure_ascii=False, indent=2)
        
    print(f"📝 数据库已生成: {DB_OUTPUT_PATH}")

if __name__ == "__main__":
    main()