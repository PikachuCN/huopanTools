(function (global) {
  'use strict';

  function parseMoney(value) {
    var text = String(value == null ? '' : value).trim();
    if (!text) {
      return NaN;
    }
    var cleaned = text.replace(/[￥元,\s，%]/g, '');
    if (!cleaned) {
      return NaN;
    }
    var num = Number(cleaned);
    return Number.isFinite(num) ? num : NaN;
  }

  function parseRate(value) {
    var num = parseMoney(value);
    if (!Number.isFinite(num)) {
      return NaN;
    }
    return Math.abs(num) > 1 ? num / 100 : num;
  }

  function normalizeQty(value) {
    var num = Math.floor(Number(value));
    return Number.isFinite(num) && num >= 1 ? num : 1;
  }

  function toFinite(value, fallback) {
    var num = Number(value);
    return Number.isFinite(num) ? num : fallback;
  }

  function buildProductMap(products) {
    var map = new Map();
    (Array.isArray(products) ? products : []).forEach(function (p) {
      if (!p || !p.product_id) {
        return;
      }
      map.set(String(p.product_id), {
        product_id: String(p.product_id),
        product_name: String(p.product_name || p.product_id),
        cost: toFinite(p.cost, 0),
        image_url: String(p.image_url || ''),
        stock: Math.max(0, Math.floor(toFinite(p.stock, 0)))
      });
    });
    return map;
  }

  function computeBundle(bundle, productMap, index) {
    var safeBundle = bundle || {};
    var items = Array.isArray(safeBundle.items) ? safeBundle.items : [];

    var CBase = CalcEngine.computeBaseCost(items, productMap);
    var metrics = CalcEngine.calculate('quick', {
      P: parseMoney(safeBundle.calc && safeBundle.calc.priceP),
      r_comm: parseRate(safeBundle.calc && safeBundle.calc.r_comm),
      C_base: CBase
    });
    var stock = CalcEngine.inferStock(items, productMap, metrics);

    var itemRows = items.map(function (row) {
      var product = productMap.get(String(row.product_id));
      var qty = normalizeQty(row.qty);
      var cost = product ? toFinite(product.cost, 0) : 0;
      var skuStock = product ? Math.max(0, Math.floor(toFinite(product.stock, 0))) : 0;
      return {
        product_id: String(row.product_id || ''),
        product_name: product ? String(product.product_name || row.product_id) : '[缺失SKU] ' + String(row.product_id || ''),
        image_url: product ? String(product.image_url || '') : '',
        qty: qty,
        cost: cost,
        lineCost: cost * qty,
        stock: skuStock,
        maxSetsContribution: qty > 0 ? Math.floor(skuStock / qty) : 0
      };
    });

    return {
      id: String(safeBundle.id || ''),
      title: String(safeBundle.title || ('套装' + (index + 1))),
      notes: String(safeBundle.notes || ''),
      mode: 'quick',
      items: itemRows,
      metrics: metrics,
      stock: stock
    };
  }

  function buildExportData(appState) {
    var products = Array.isArray(appState && appState.products) ? appState.products : [];
    var bundlesRaw = appState && appState.workspace && Array.isArray(appState.workspace.bundles)
      ? appState.workspace.bundles
      : [];

    var productMap = buildProductMap(products);
    var bundles = bundlesRaw.map(function (bundle, index) {
      return computeBundle(bundle, productMap, index);
    });

    var summary = {
      bundleCount: bundles.length,
      totalMaxSets: 0,
      totalGmv: 0,
      totalCommission: 0,
      totalProfit: 0
    };

    bundles.forEach(function (bundle) {
      summary.totalMaxSets += toFinite(bundle.stock.maxSets, 0);
      summary.totalGmv += toFinite(bundle.stock.gmv, 0);
      summary.totalCommission += toFinite(bundle.stock.commissionBudget, 0);
      summary.totalProfit += toFinite(bundle.stock.profitCapacity, 0);
    });

    return {
      generatedAt: new Date().toLocaleString('zh-CN', { hour12: false }),
      productsCount: products.length,
      feeRate: CalcEngine.FEE_RATE,
      bundles: bundles,
      summary: summary
    };
  }

  function formatFileTime(date) {
    function pad(num) {
      return String(num).padStart(2, '0');
    }
    return [
      date.getFullYear(),
      pad(date.getMonth() + 1),
      pad(date.getDate()),
      '_',
      pad(date.getHours()),
      pad(date.getMinutes()),
      pad(date.getSeconds())
    ].join('');
  }

  function downloadHtml(filename, html) {
    var blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () {
      URL.revokeObjectURL(url);
    }, 1000);
  }

  function exportOperation(appState) {
    var data = buildExportData(appState);
    var html = ExportTemplates.createOperationHtml(data);
    var filename = '货盘运营版_' + formatFileTime(new Date()) + '.html';
    downloadHtml(filename, html);
  }

  function previewOperation(appState) {
    var data = buildExportData(appState);
    var html = ExportTemplates.createOperationHtml(data);
    openPreview(html);
  }

  function exportStreamer(appState) {
    var data = buildExportData(appState);
    var html = ExportTemplates.createStreamerHtml(data);
    var filename = '货盘主播版_' + formatFileTime(new Date()) + '.html';
    downloadHtml(filename, html);
  }

  function exportStandard(appState) {
    var data = buildExportData(appState);
    var html = ExportTemplates.createStandardHtml(data);
    var filename = '货盘普通版_' + formatFileTime(new Date()) + '.html';
    downloadHtml(filename, html);
  }

  function openPreview(html) {
    var blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var win = window.open(url, '_blank');

    if (!win) {
      URL.revokeObjectURL(url);
      throw new Error('浏览器拦截了弹窗，请允许后重试。');
    }

    setTimeout(function () {
      URL.revokeObjectURL(url);
    }, 30000);
  }

  function previewStreamer(appState) {
    var data = buildExportData(appState);
    var html = ExportTemplates.createStreamerHtml(data);
    openPreview(html);
  }

  function previewStandard(appState) {
    var data = buildExportData(appState);
    var html = ExportTemplates.createStandardHtml(data);
    openPreview(html);
  }

  global.ExportService = {
    buildExportData: buildExportData,
    exportOperation: exportOperation,
    previewOperation: previewOperation,
    exportStreamer: exportStreamer,
    previewStreamer: previewStreamer,
    exportStandard: exportStandard,
    previewStandard: previewStandard
  };
})(window);
