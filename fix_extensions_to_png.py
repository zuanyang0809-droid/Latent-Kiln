import json
import os

# ================= 配置 =================
# 你的 JSON 数据库位置
JSON_PATH = "src/frontend_master_db.json" 
if not os.path.exists(JSON_PATH):
    JSON_PATH = "frontend_master_db.json"

# =======================================

print(f"🔧 开始修正文件后缀名 (.jpg -> .png) ...")
print(f"目标文件: {JSON_PATH}")

try:
    with open(JSON_PATH, 'r', encoding='utf-8') as f:
        data = json.load(f)
except Exception as e:
    print(f"❌ 无法读取 JSON: {e}")
    exit()

count = 0

for item in data:
    assets = item.get('assets', {})
    
    # 1. 检查 Original Image URL
    if 'image_url' in assets:
        old_url = assets['image_url']
        # 如果是以 .jpg 结尾，强制改成 .png
        if old_url.lower().endswith('.jpg') or old_url.lower().endswith('.jpeg'):
            new_url = os.path.splitext(old_url)[0] + '.png'
            assets['image_url'] = new_url
            count += 1
            
    # Depth map 通常本来就是 png，不用动
    # Parts 本来就是 png，不用动

# 保存回去
with open(JSON_PATH, 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=4)

print("-" * 30)
print(f"✅ 修复完成！共修改了 {count} 条数据。")
print("现在 JSON 指向的都是 .png 文件了。")