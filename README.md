# 直播货盘组合系统

一个纯前端（HTML + CSS + JavaScript）的直播货盘管理工具，用于导入 SKU、编辑套装、计算利润，并导出不同角色视图的 HTML 文件。

## 功能概览

- 导入 CSV 商品库（支持常见字段别名自动识别）
- 套装编辑（增删商品、数量、备注、复制/删除套装）
- 计算面板（售价 + 佣金率 + 平台服务费率，默认 7% 可编辑）
- 动态库存联动
- 修改某套装已售套数后，交叉 SKU 会动态扣减
- 自动计算其他套装的动态剩余可卖套数
- 运营版、主播版、普通版 HTML 导出与预览
- JSON 备份导入/导出（便于跨运营同事协作）
- 本地自动持久化（`localStorage`）

## 快速开始

1. 直接双击打开 `index.html`，或用任意静态服务器启动。
2. 点击“导入CSV”导入产品库。
3. 在左侧产品库点击“加入”把商品放入当前套装。
4. 在“套装编辑”里调整数量、库存、备注。
5. 在“货盘套装列表”中填写已售套数，观察其他套装动态剩余联动变化。
6. 按需导出运营版/主播版/普通版 HTML 或 JSON 备份。

## CSV 字段要求

必要字段：
- `product_id`
- `product_name`
- `cost`

可选字段：
- `image_url`
- `stock`

支持别名（示例）：
- `product_id` 可用 `id`、`sku`
- `product_name` 可用 `name`、`title`
- `cost` 可用 `price`
- `image_url` 可用 `img`、`image`
- `stock` 可用 `inventory`、`qty`、`quantity`

说明：
- `stock` 缺失时默认为 `0`
- 数值允许带 `￥`、空格、逗号
- 相同 `product_id` 会使用最后一条记录覆盖

## 计算说明

快速模式输入：
- 售价 `P`
- 佣金率 `r_comm`（支持 `0.2` 或 `20`）
- 平台服务费率 `r_fee`（支持 `0.07` 或 `7`，默认 `7%`）

主要指标：
- 成本合计 `C_base = Σ(商品成本 × 套装数量)`
- 平台服务费 `Fee = P × r_fee`
- 佣金额 `Commission = P × r_comm`
- 单套利润 `Profit = P - (C_base + Fee) - Commission`
- 利润率 `ProfitRate = Profit / P`

库存相关：
- 理论可卖套数：只看各 SKU 当前总库存
- 动态剩余可卖套数：扣减所有套装“已售套数”后的联动结果

## 导出说明

- 运营版 HTML：明细最全，含图片、成本、库存、利润、风控提示
- 主播版 HTML：偏直播口径，含套装明细、售价、佣金、备注
- 普通版 HTML：简化展示，含套装与产品组合（含图片）
- JSON 备份：包含产品库、更新时间、工作区套装数据

## 数据存储

本地存储键：
- `live_combo_products_v1`
- `live_combo_products_updated_at_v1`
- `live_combo_workspace_v1`

说明：
- 页面刷新后数据仍保留
- 清除浏览器站点数据会导致本地数据丢失
- 建议定期导出 JSON 备份

## 项目结构

- `index.html`：页面结构与入口
- `assets/app.js`：主交互逻辑与渲染
- `assets/csv.js`：CSV 解析与字段映射
- `assets/calc.js`：计算引擎
- `assets/export.js`：导出与预览逻辑
- `assets/templates.js`：三种导出模板
- `assets/storage.js`：本地存储封装
- `assets/styles.css`：样式

## 常见问题

- 导出预览打不开：请允许浏览器弹窗。
- CSV 导入后数据异常：检查列名是否命中必要字段，或是否有非法数值。
- 出现“超卖”提示：说明交叉 SKU 已被已售套数扣减过量，需调整已售或总库存。
