import os
import shutil
import csv
import json
import re

# ================= 配置区域 (请仔细核对！) =================
# 1. CSV 文件
CSV_FILE = r"C:\GSD\SCI\Final\web_database.csv"

# 2. 源素材文件夹 (请核对这些路径是否真的存在！)
# 你的图片到底在哪？如果是 Final/Final_Data_Packages/Photos_NoBG/train/... 请把 /train 加上
SRC_NOBG_ROOT = r"C:\GSD\SCI\Final\Final_Data_Packages\Photos_NoBG\train" 
SRC_DEPTH_ROOT = r"C:\GSD\SCI\Final\Final_Data_Packages\Depth\train"
SRC_PARTS_ROOT = r"C:\GSD\SCI\Final\Vase_Parts_Library_Drag" 

# 3. 目标输出文件夹 (当前 VS Code 项目里的 public)
DEST_ROOT = r"public/assets/images"

# 4. 输出的 JSON (为了保险，我们先输出到根目录，防止找不到 src)
OUTPUT_JSON = "frontend_master_db.json"
# ===========================================

# 检查源路径是否存在
if not os.path.exists(SRC_NOBG_ROOT):
    print(f"❌ 致命错误：找不到源文件夹 {SRC_NOBG_ROOT}")
    print("请去文件夹里确认一下路径到底是什么！")
    exit()

# 清理并重建目标目录
if os.path.exists(DEST_ROOT):
    shutil.rmtree(DEST_ROOT)
    print(f"🧹 已清空旧文件夹: {DEST_ROOT}")

for sub in ["original", "depth", "parts/neck", "parts/body", "parts/base"]:
    os.makedirs(os.path.join(DEST_ROOT, sub), exist_ok=True)

print("🚀 开始搬运...")

# 读取 CSV
if not os.path.exists(CSV_FILE):
    print(f"❌ 找不到 CSV: {CSV_FILE}")
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

def find_source_file(root_folder, filename_stem):
    # 递归查找文件
    for root, _, files in os.walk(root_folder):
        for f in files:
            # 只要文件名包含 stem 且是图片
            if os.path.splitext(f)[0] == filename_stem and f.lower().endswith(('.png', '.jpg', '.jpeg')):
                return os.path.join(root, f)
    return None

for row in csv_data:
    original_filename = row['filename']
    region = row['region']
    name_stem = os.path.splitext(original_filename)[0]
    
    # 新名字：Region_Name.png
    clean_stem = sanitize_name(name_stem)
    unique_name = f"{region}_{clean_stem}.png"
    
    # 1. 搬运 Original
    src_img = find_source_file(SRC_NOBG_ROOT, name_stem)
    if src_img:
        shutil.copy(src_img, os.path.join(DEST_ROOT, "original", unique_name))
    else:
        # 如果找不到图，为了防止网页报错，我们跳过这条数据
        # print(f"⚠️ 缺图跳过: {name_stem}")
        continue 

    # 2. 搬运 Depth
    src_depth = find_source_file(SRC_DEPTH_ROOT, name_stem)
    if src_depth:
        shutil.copy(src_depth, os.path.join(DEST_ROOT, "depth", unique_name))
    
    # 3. 搬运 Parts (尝试找)
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
        "id": clean_stem,
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

# 保存 JSON
with open(OUTPUT_JSON, 'w', encoding='utf-8') as f:
    json.dump(master_db, f, indent=4)

print("-" * 30)
print(f"✅ 成功搬运: {processed_count} 张图片！")
print(f"JSON 已生成: {OUTPUT_JSON}")