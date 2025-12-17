import os
import shutil
import json
import random
import re
from pathlib import Path

# ================= 配置区域 =================

# 1. 源文件夹路径 (你的 C 盘路径)
SOURCE_DIR = r"C:\GSD\SCI\Final\Final_Data_Packages\Photos_NoBG"

# 获取当前脚本所在目录，向上两级找到项目根目录
CURRENT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = CURRENT_DIR.parent

# 2. 项目里的目标图片文件夹
TARGET_DIR = PROJECT_ROOT / "public" / "assets" / "images" / "original"

# 3. 输出的新数据库文件路径
DB_OUTPUT_PATH = PROJECT_ROOT / "frontend_master_db_new.json"

# ==========================================

def get_region_from_folder_name(folder_name):
    """
    根据文件夹名字判断地区。
    处理: 'Dataset_Africa', 'Data_East Asia', 'Dataset_middle_east' 等
    """
    lower = folder_name.lower()
    
    # 优先级匹配：名字越长的越先匹配 (防止 'East Asia' 被匹配成 'Asia')
    if 'middle_east' in lower or 'middle east' in lower: return 'Middle East'
    if 'east asia' in lower or 'east_asia' in lower: return 'East Asia'
    if 'africa' in lower: return 'Africa'
    if 'americas' in lower or 'america' in lower: return 'Americas'
    if 'europe' in lower: return 'Europe'
    if 'asia' in lower: return 'East Asia' # 假设单独的 Asia 也是 East Asia
    
    return None # 如果文件夹名字里看不出地区 (比如 'train', 'test')

def clean_filename(name):
    """清理文件名，去掉特殊字符"""
    # 去掉扩展名
    stem = Path(name).stem
    # 把空格、括号、非字母数字字符替换为下划线
    clean = re.sub(r'[^\w\-]', '_', stem)
    return clean

def get_random_coord():
    """生成随机坐标"""
    return {
        "x": round(random.uniform(-160, 160), 4),
        "y": round(random.uniform(-70, 70), 4)
    }

def main():
    print("🚀 开始深度扫描并提取图片...")

    source_path = Path(SOURCE_DIR)
    if not source_path.exists():
        print(f"❌ 错误：找不到源文件夹: {SOURCE_DIR}")
        return

    # 1. 清空目标文件夹
    if TARGET_DIR.exists():
        shutil.rmtree(TARGET_DIR)
    TARGET_DIR.mkdir(parents=True, exist_ok=True)
    print(f"🧹 已清空目标文件夹: {TARGET_DIR}")

    db_data = []
    seen_ids = set()
    count = 0

    # 2. 递归遍历 (os.walk 会自动钻进 train, test 和里面的子文件夹)
    for root, dirs, files in os.walk(source_path):
        current_folder_name = os.path.basename(root)
        
        # 尝试从当前文件夹名字获取地区
        # 比如当前在 'Dataset_Africa' 文件夹里，region 就是 'Africa'
        region = get_region_from_folder_name(current_folder_name)
        
        # 如果当前文件夹叫 'train' 或 'test'，它不是地区名，我们不管它，继续往下找
        if not region and files:
            # 尝试看看上一级文件夹是不是地区名 (以防万一结构是 Africa/train/img.png)
            parent_name = os.path.basename(os.path.dirname(root))
            region = get_region_from_folder_name(parent_name)
        
        # 如果还是找不到地区，标记为 Unknown，但通常你的结构里能找到
        final_region = region if region else "Unknown"

        for file in files:
            if file.lower().endswith(('.png', '.jpg', '.jpeg')):
                
                # --- 生成新文件名 ---
                # 原始文件名清洗
                clean_name = clean_filename(file)
                
                # 新 ID = 地区 + 原始名 (例如: Africa_vase_001)
                # 这样可以防止不同文件夹里有同名文件 (如 001.png)
                new_id = f"{final_region}_{clean_name}"
                
                # 确保 ID 唯一
                unique_id = new_id
                counter = 1
                while unique_id in seen_ids:
                    unique_id = f"{new_id}_{counter}"
                    counter += 1
                seen_ids.add(unique_id)

                # 新的文件名 (保留后缀)
                extension = Path(file).suffix
                new_filename = f"{unique_id}{extension}"

                # --- 复制 ---
                src_file_path = os.path.join(root, file)
                dst_file_path = TARGET_DIR / new_filename
                
                shutil.copy2(src_file_path, dst_file_path)

                # --- 添加数据库条目 ---
                entry = {
                    "id": unique_id,
                    "region": final_region,
                    "period": "Unknown",
                    "globe_coordinates": get_random_coord(),
                    "assets": {
                        "image_url": f"/assets/images/original/{new_filename}",
                        "depth_url": "",
                        "parts": { "neck": "", "body": "", "base": "" }
                    }
                }
                db_data.append(entry)
                count += 1

    # 3. 写入 JSON
    print(f"✅ 提取完成！共处理 {count} 张图片。")
    print(f"📂 图片已存入: public/assets/images/original")
    
    with open(DB_OUTPUT_PATH, 'w', encoding='utf-8') as f:
        json.dump(db_data, f, ensure_ascii=False, indent=2)
        
    print(f"📝 新数据库生成: src/frontend_master_db_new.json")
    print("🎉 请记得重命名数据库文件并重启 React！")

if __name__ == "__main__":
    main()