import os
import shutil
import csv
import json
import re

# ================= 配置区域 (保持你之前的路径) =================
CSV_FILE = r"C:\GSD\SCI\Final\web_database.csv"

# 请确认这些路径是对的
SRC_NOBG_ROOT = r"C:\GSD\SCI\Final\Final_Data_Packages\Photos_NoBG" 
SRC_DEPTH_ROOT = r"C:\GSD\SCI\Final\Final_Data_Packages\Depth"
SRC_PARTS_ROOT = r"C:\GSD\SCI\Final\Vase_Parts_Library_Drag" 

# 输出位置
DEST_ROOT = r"public/assets/images"
OUTPUT_JSON = "frontend_master_db.json"
# ===========================================

# 清理目标目录
if os.path.exists(DEST_ROOT):
    try:
        shutil.rmtree(DEST_ROOT)
        print(f"🧹 已清空旧文件夹: {DEST_ROOT}")
    except:
        print("⚠️ 无法自动清空文件夹，请手动删除 public/assets/images 后再运行！")

for sub in ["original", "depth", "parts/neck", "parts/body", "parts/base"]:
    os.makedirs(os.path.join(DEST_ROOT, sub), exist_ok=True)

print("🚀 开始带【黑名单过滤】的搬运...")

# 读取 CSV
if not os.path.exists(CSV_FILE):
    print("❌ 找不到 CSV")
    exit()

with open(CSV_FILE, 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    csv_data = list(reader)

master_db = []
processed_count = 0

def sanitize_name(name):
    name = os.path.splitext(name)[0]
    name = re.sub(r'[()\s]+', '_', name)
    return name.strip('_')

# === 关键修改：增加 ignore_keywords 参数 ===
def find_source_file(root_folder, filename_stem, ignore_keywords=None):
    if ignore_keywords is None:
        ignore_keywords = []
        
    for root, dirs, files in os.walk(root_folder):
        # 1. 过滤掉不想进入的文件夹 (比如 parts, neck, body)
        # 这一步能防止脚本误入歧途
        dirs[:] = [d for d in dirs if not any(bad in d.lower() for bad in ignore_keywords)]
        
        # 2. 检查当前路径是否包含关键词 (双重保险)
        if any(bad in root.lower() for bad in ignore_keywords):
            continue

        for f in files:
            if os.path.splitext(f)[0] == filename_stem and f.lower().endswith(('.png', '.jpg', '.jpeg')):
                return os.path.join(root, f)
    return None

for row in csv_data:
    original_filename = row['filename']
    region = row['region']
    name_stem = os.path.splitext(original_filename)[0]
    
    clean_stem = sanitize_name(name_stem)
    unique_name = f"{region}_{clean_stem}.png"
    unique_id = f"{region}_{clean_stem}" # ID 也要加上地区
    
    # 1. 搬运 Original (关键：忽略 parts 文件夹)
    # 我们告诉脚本：找原图时，千万别去 neck, body, base 里面找！
    src_img = find_source_file(SRC_NOBG_ROOT, name_stem, ignore_keywords=["part", "neck", "body", "base", "mask", "edge"])
    
    if src_img:
        shutil.copy(src_img, os.path.join(DEST_ROOT, "original", unique_name))
    else:
        continue # 没原图就跳过

    # 2. 搬运 Depth
    src_depth = find_source_file(SRC_DEPTH_ROOT, name_stem)
    if src_depth:
        shutil.copy(src_depth, os.path.join(DEST_ROOT, "depth", unique_name))
    
    # 3. 搬运 Parts (这里不需要过滤，因为我们指定要去 parts 文件夹找)
    parts_paths = {"neck": "", "body": "", "base": ""}
    for part_name in ["neck", "body", "base"]:
        part_src_root = os.path.join(SRC_PARTS_ROOT, part_name)
        if os.path.exists(part_src_root):
            src_part = find_source_file(part_src_root, name_stem)
            if src_part:
                shutil.copy(src_part, os.path.join(DEST_ROOT, f"parts/{part_name}", unique_name))
                parts_paths[part_name] = f"/assets/images/parts/{part_name}/{unique_name}"

    # 4. 写入 JSON
    entry = {
        "id": unique_id,
        "region": region,
        "globe_coordinates": { "x": float(row['x']), "y": float(row['y']) },
        "assets": {
            "image_url": f"/assets/images/original/{unique_name}",
            "depth_url": f"/assets/images/depth/{unique_name}",
            "parts": parts_paths
        }
    }
    master_db.append(entry)
    processed_count += 1
    
    if processed_count % 50 == 0:
        print(f"已处理 {processed_count} 张...")

with open(OUTPUT_JSON, 'w', encoding='utf-8') as f:
    json.dump(master_db, f, indent=4)

print("-" * 30)
print(f"✅ 修复完成！共处理: {processed_count} 张")
print("切片干扰已排除，现在 Original 文件夹里应该全是完整的花瓶了。")