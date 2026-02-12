(function (global) {
  'use strict';

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function fmtMoney(value) {
    var n = Number(value);
    return Number.isFinite(n) ? '¥' + n.toFixed(2) : '--';
  }

  function fmtPct(value) {
    var n = Number(value);
    return Number.isFinite(n) ? (n * 100).toFixed(2) + '%' : '--';
  }

  function fmtInt(value) {
    var n = Math.floor(Number(value));
    return Number.isFinite(n) ? String(n) : '0';
  }

  function baseStyle(extra) {
    return [
      'body{margin:0;padding:20px;background:#f4f7fb;color:#1b2d42;font-family:"Segoe UI Variable","Trebuchet MS","PingFang SC","Microsoft YaHei",sans-serif;}',
      '.container{max-width:1280px;margin:0 auto;}',
      'h1{margin:0 0 10px;font-size:28px;}',
      'h2{margin:0 0 10px;font-size:20px;}',
      '.meta{color:#4f647b;margin:0 0 14px;font-size:14px;}',
      '.card{background:#fff;border:1px solid #d8e3f0;border-radius:12px;padding:12px;margin-bottom:12px;}',
      '.table-wrap{overflow:auto;}',
      '.table{width:100%;border-collapse:collapse;font-size:13px;background:#fff;}',
      '.table th,.table td{border:1px solid #d8e3f0;padding:7px 8px;vertical-align:top;}',
      '.table th{background:#eef4fc;text-align:left;white-space:nowrap;}',
      '.muted{color:#6f8398;}',
      '.alert{background:#fee9e9;border:1px solid #f1b8b8;color:#af2d2d;padding:8px 10px;border-radius:8px;margin:8px 0;}',
      '.item-cell{min-width:240px;}',
      '.item-line{display:flex;align-items:center;gap:6px;margin:3px 0;}',
      '.thumb{width:34px;height:34px;object-fit:cover;border-radius:6px;border:1px solid #d8e3f0;background:#f5f7fb;}',
      '.thumb{transition:transform .18s ease,box-shadow .18s ease;transform-origin:center;position:relative;z-index:1;}',
      '.thumb:hover{transform:scale(1.9);z-index:10;box-shadow:0 8px 16px rgba(20,50,92,.25);}',
      '.mono{font-family:Consolas,"Courier New",monospace;}',
      '@media (max-width:860px){body{padding:10px}}',
      extra || ''
    ].join('');
  }

  function renderItemList(items, includeImage) {
    if (!items || items.length === 0) {
      return '<span class="muted">暂无商品</span>';
    }

    return items.map(function (item) {
      var img = '';
      if (includeImage) {
        img = item.image_url
          ? '<img class="thumb" src="' + escapeHtml(item.image_url) + '" alt="" />'
          : '<span class="thumb"></span>';
      }
      return '<div class="item-line">' + img + '<span>' + escapeHtml(item.product_name) + ' x ' + fmtInt(item.qty) + '</span></div>';
    }).join('');
  }

  function renderOperationBundle(bundle, index) {
    var metrics = bundle.metrics;
    var stock = bundle.stock;

    var rows = bundle.items.map(function (item) {
      var imageNode = item.image_url
        ? '<img class="thumb" src="' + escapeHtml(item.image_url) + '" alt="" />'
        : '<span class="thumb"></span>';

      return [
        '<tr>',
        '<td>' + imageNode + '</td>',
        '<td class="mono">' + escapeHtml(item.product_id) + '</td>',
        '<td>' + escapeHtml(item.product_name) + '</td>',
        '<td>' + fmtMoney(item.cost) + '</td>',
        '<td>' + fmtInt(item.qty) + '</td>',
        '<td>' + fmtMoney(item.lineCost) + '</td>',
        '<td>' + fmtInt(item.stock) + '</td>',
        '<td>' + fmtInt(item.maxSetsContribution) + '</td>',
        '</tr>'
      ].join('');
    }).join('');

    if (!rows) {
      rows = '<tr><td colspan="8" class="muted">暂无商品</td></tr>';
    }

    var warningHtml = '';
    if (!metrics.valid) {
      warningHtml += '<p class="alert">' + escapeHtml(metrics.message || '参数未完整') + '</p>';
    } else if (metrics.loss) {
      warningHtml += '<p class="alert">当前组合为亏损，请调整售价或佣金率。</p>';
    }

    return [
      '<section class="card">',
      '<h2>' + (index + 1) + '. ' + escapeHtml(bundle.title) + '</h2>',
      '<p class="meta">计算方式：快速模式（售价 + 佣金率）</p>',
      '<div class="table-wrap"><table class="table"><tbody>',
      '<tr><th>备注/卖点</th><td colspan="7">' + escapeHtml(bundle.notes || '无') + '</td></tr>',
      '<tr><th>成本合计</th><td>' + fmtMoney(metrics.C_base) + '</td><th>售价</th><td>' + fmtMoney(metrics.P) + '</td><th>服务费率</th><td>' + fmtPct(metrics.r_fee) + '</td><th>平台服务费</th><td>' + fmtMoney(metrics.Fee) + '</td></tr>',
      '<tr><th>佣金率</th><td>' + fmtPct(metrics.r_comm) + '</td><th>佣金额</th><td>' + fmtMoney(metrics.Commission) + '</td><th>不亏损佣金率上限</th><td>' + fmtPct(metrics.maxSafeCommissionRate) + '</td><th>实际成本</th><td>' + fmtMoney(metrics.C_actual) + '</td></tr>',
      '<tr><th>单套利润</th><td>' + fmtMoney(metrics.Profit) + '</td><th>利润率</th><td>' + fmtPct(metrics.ProfitRate) + '</td><th>最大可卖套数</th><td>' + fmtInt(stock.maxSets) + '</td><th>可撑GMV</th><td>' + fmtMoney(stock.gmv) + '</td></tr>',
      '<tr><th>可撑佣金支出</th><td>' + fmtMoney(stock.commissionBudget) + '</td><th>可撑利润</th><td>' + fmtMoney(stock.profitCapacity) + '</td><th colspan="4"></th></tr>',
      '</tbody></table></div>',
      warningHtml,
      '<div class="table-wrap"><table class="table">',
      '<thead><tr><th>图片</th><th>产品ID</th><th>产品名</th><th>成本</th><th>数量</th><th>小计</th><th>库存</th><th>单品可卖套数</th></tr></thead>',
      '<tbody>' + rows + '</tbody>',
      '</table></div>',
      '</section>'
    ].join('');
  }

  function createOperationHtml(data) {
    var bundlesHtml = data.bundles.map(renderOperationBundle).join('');
    if (!bundlesHtml) {
      bundlesHtml = '<p class="muted">暂无套装数据。</p>';
    }

    return [
      '<!doctype html>',
      '<html lang="zh-CN">',
      '<head>',
      '<meta charset="UTF-8" />',
      '<meta name="viewport" content="width=device-width, initial-scale=1.0" />',
      '<title>直播货盘组合系统 - 运营版</title>',
      '<style>',
      baseStyle(),
      '</style>',
      '</head>',
      '<body>',
      '<div class="container">',
      '<h1>直播货盘组合系统（运营版）</h1>',
      '<p class="meta">导出时间：' + escapeHtml(data.generatedAt) + '</p>',
      '<section class="card">',
      '<div class="table-wrap"><table class="table"><tbody>',
      '<tr><th>套装数</th><td>' + fmtInt(data.summary.bundleCount) + '</td><th>SKU总数</th><td>' + fmtInt(data.productsCount) + '</td><th>总可卖套数</th><td>' + fmtInt(data.summary.totalMaxSets) + '</td></tr>',
      '<tr><th>总可撑GMV</th><td>' + fmtMoney(data.summary.totalGmv) + '</td><th>总可撑佣金支出</th><td>' + fmtMoney(data.summary.totalCommission) + '</td><th>总可撑利润</th><td>' + fmtMoney(data.summary.totalProfit) + '</td></tr>',
      '</tbody></table></div>',
      '</section>',
      bundlesHtml,
      '</div>',
      '</body>',
      '</html>'
    ].join('');
  }

  function createStreamerHtml(data) {
    var rows = data.bundles.map(function (bundle, index) {
      var metrics = bundle.metrics;
      return [
        '<tr>',
        '<td>' + (index + 1) + '</td>',
        '<td>' + escapeHtml(bundle.title) + '</td>',
        '<td class="item-cell">' + renderItemList(bundle.items, true) + '</td>',
        '<td>' + (metrics.valid ? fmtMoney(metrics.P) : '待定') + '</td>',
        '<td>' + (metrics.valid ? fmtPct(metrics.r_comm) : '待定') + '</td>',
        '<td>' + (metrics.valid ? fmtMoney(metrics.Commission) : '待定') + '</td>',
        '<td>' + escapeHtml(bundle.notes || '') + '</td>',
        '</tr>'
      ].join('');
    }).join('');

    var safeRows = rows || '<tr><td colspan="7" class="muted">暂无套装数据。</td></tr>';

    return [
      '<!doctype html>',
      '<html lang="zh-CN">',
      '<head>',
      '<meta charset="UTF-8" />',
      '<meta name="viewport" content="width=device-width, initial-scale=1.0" />',
      '<title>直播货盘组合系统 - 主播版</title>',
      '<style>',
      baseStyle('body{background:#f6f9ff;}'),
      '</style>',
      '</head>',
      '<body>',
      '<div class="container">',
      '<h1>直播货盘组合系统（主播版）</h1>',
      '<p class="meta">导出时间：' + escapeHtml(data.generatedAt) + ' ｜ 套装数：' + fmtInt(data.summary.bundleCount) + '</p>',
      '<section class="card">',
      '<div class="table-wrap"><table class="table">',
      '<thead><tr><th>#</th><th>套装标题</th><th>组合明细</th><th>售价</th><th>佣金率</th><th>佣金额</th><th>备注/卖点</th></tr></thead>',
      '<tbody>' + safeRows + '</tbody>',
      '</table></div>',
      '</section>',
      '</div>',
      '</body>',
      '</html>'
    ].join('');
  }

  function createStandardHtml(data) {
    var validPriceBundleCount = 0;
    var totalShownPrice = 0;

    var rows = data.bundles.map(function (bundle, index) {
      var metrics = bundle.metrics;
      var price = metrics.valid ? metrics.P : NaN;
      if (Number.isFinite(price)) {
        validPriceBundleCount += 1;
        totalShownPrice += price;
      }

      return [
        '<tr>',
        '<td>' + (index + 1) + '</td>',
        '<td>' + escapeHtml(bundle.title) + '</td>',
        '<td class="item-cell">' + renderItemList(bundle.items, false) + '</td>',
        '<td>' + (Number.isFinite(price) ? fmtMoney(price) : '待定') + '</td>',
        '</tr>'
      ].join('');
    }).join('');

    var safeRows = rows || '<tr><td colspan="4" class="muted">暂无套装数据。</td></tr>';

    return [
      '<!doctype html>',
      '<html lang="zh-CN">',
      '<head>',
      '<meta charset="UTF-8" />',
      '<meta name="viewport" content="width=device-width, initial-scale=1.0" />',
      '<title>直播货盘组合系统 - 普通版</title>',
      '<style>',
      baseStyle('body{background:#f7fafc;}'),
      '</style>',
      '</head>',
      '<body>',
      '<div class="container">',
      '<h1>直播货盘组合系统（普通版）</h1>',
      '<p class="meta">导出时间：' + escapeHtml(data.generatedAt) + '</p>',
      '<section class="card">',
      '<div class="table-wrap"><table class="table"><tbody>',
      '<tr><th>套装总数</th><td>' + fmtInt(data.summary.bundleCount) + '</td><th>有售价套装</th><td>' + fmtInt(validPriceBundleCount) + '</td><th>售价合计</th><td>' + fmtMoney(totalShownPrice) + '</td></tr>',
      '</tbody></table></div>',
      '</section>',
      '<section class="card">',
      '<div class="table-wrap"><table class="table">',
      '<thead><tr><th>#</th><th>套装标题</th><th>产品组合</th><th>总售价</th></tr></thead>',
      '<tbody>' + safeRows + '</tbody>',
      '</table></div>',
      '</section>',
      '</div>',
      '</body>',
      '</html>'
    ].join('');
  }

  global.ExportTemplates = {
    createOperationHtml: createOperationHtml,
    createStreamerHtml: createStreamerHtml,
    createStandardHtml: createStandardHtml
  };
})(window);
