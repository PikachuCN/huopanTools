(function (global) {
  'use strict';

  var state = {
    products: [],
    productsUpdatedAt: null,
    workspace: {
      bundles: [],
      currentBundleId: ''
    }
  };

  var productMap = new Map();
  var statusTimer = null;
  var els = {};

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    cacheElements();
    bindEvents();
    loadState();
    ensureWorkspace();
    rebuildProductMap();
    renderAll();
  }

  function cacheElements() {
    els.importCsvBtn = document.getElementById('importCsvBtn');
    els.csvFileInput = document.getElementById('csvFileInput');
    els.clearDbBtn = document.getElementById('clearDbBtn');
    els.skuCount = document.getElementById('skuCount');
    els.skuUpdatedAt = document.getElementById('skuUpdatedAt');
    els.exportOpsBtn = document.getElementById('exportOpsBtn');
    els.previewOpsBtn = document.getElementById('previewOpsBtn');
    els.exportHostBtn = document.getElementById('exportHostBtn');
    els.previewHostBtn = document.getElementById('previewHostBtn');
    els.exportNormalBtn = document.getElementById('exportNormalBtn');
    els.previewNormalBtn = document.getElementById('previewNormalBtn');
    els.statusBar = document.getElementById('statusBar');

    els.productSearchInput = document.getElementById('productSearchInput');
    els.productList = document.getElementById('productList');

    els.bundleTitleInput = document.getElementById('bundleTitleInput');
    els.bundleItemsBody = document.getElementById('bundleItemsBody');
    els.bundleNotesInput = document.getElementById('bundleNotesInput');

    els.calcPriceInput = document.getElementById('calcPriceInput');
    els.calcCommInput = document.getElementById('calcCommInput');

    els.outCBase = document.getElementById('outCBase');
    els.outPrice = document.getElementById('outPrice');
    els.outFee = document.getElementById('outFee');
    els.outCommissionAmount = document.getElementById('outCommissionAmount');
    els.outCommissionRate = document.getElementById('outCommissionRate');
    els.outCActual = document.getElementById('outCActual');
    els.outProfit = document.getElementById('outProfit');
    els.outProfitRate = document.getElementById('outProfitRate');
    els.outMaxSets = document.getElementById('outMaxSets');
    els.outMaxGmv = document.getElementById('outMaxGmv');
    els.outMaxCommission = document.getElementById('outMaxCommission');
    els.outMaxProfit = document.getElementById('outMaxProfit');
    els.calcWarning = document.getElementById('calcWarning');

    els.addBundleBtn = document.getElementById('addBundleBtn');
    els.copyBundleBtn = document.getElementById('copyBundleBtn');
    els.deleteBundleBtn = document.getElementById('deleteBundleBtn');
    els.bundleCards = document.getElementById('bundleCards');

    els.sumBundleCount = document.getElementById('sumBundleCount');
    els.sumMaxSets = document.getElementById('sumMaxSets');
    els.sumGmv = document.getElementById('sumGmv');
    els.sumCommission = document.getElementById('sumCommission');
    els.sumProfit = document.getElementById('sumProfit');
  }

  function bindEvents() {
    els.importCsvBtn.addEventListener('click', function () {
      els.csvFileInput.click();
    });

    els.csvFileInput.addEventListener('change', handleCsvFileChange);

    els.clearDbBtn.addEventListener('click', function () {
      if (!window.confirm('确认清空产品库吗？此操作不会删除已配置套装。')) {
        return;
      }
      state.products = [];
      state.productsUpdatedAt = null;
      rebuildProductMap();
      AppStorage.clearProducts();
      renderAll();
      setStatus('产品库已清空。', 'warn');
    });

    els.productSearchInput.addEventListener('input', renderProductList);

    els.productList.addEventListener('click', function (event) {
      var button = event.target.closest('.add-product-btn');
      if (!button) {
        return;
      }
      addProductToCurrentBundle(button.getAttribute('data-product-id'));
    });

    els.bundleItemsBody.addEventListener('input', function (event) {
      if (!event.target.classList.contains('qty-input')) {
        return;
      }
      var bundle = getCurrentBundle();
      if (!bundle) {
        return;
      }
      var index = Number(event.target.getAttribute('data-index'));
      if (!Number.isInteger(index) || index < 0 || index >= bundle.items.length) {
        return;
      }
      bundle.items[index].qty = normalizeQty(event.target.value);
      persistWorkspace();
      renderBundleEditor();
      renderBundleCardsAndSummary();
    });

    els.bundleItemsBody.addEventListener('click', function (event) {
      var button = event.target.closest('.remove-item-btn');
      if (!button) {
        return;
      }
      var bundle = getCurrentBundle();
      if (!bundle) {
        return;
      }
      var index = Number(button.getAttribute('data-index'));
      if (!Number.isInteger(index) || index < 0 || index >= bundle.items.length) {
        return;
      }
      bundle.items.splice(index, 1);
      persistWorkspace();
      renderBundleEditor();
      renderBundleCardsAndSummary();
    });

    els.bundleTitleInput.addEventListener('input', function () {
      var bundle = getCurrentBundle();
      if (!bundle) {
        return;
      }
      bundle.title = els.bundleTitleInput.value;
      persistWorkspace();
      renderBundleCardsAndSummary();
    });

    els.bundleNotesInput.addEventListener('input', function () {
      var bundle = getCurrentBundle();
      if (!bundle) {
        return;
      }
      bundle.notes = els.bundleNotesInput.value;
      persistWorkspace();
    });

    els.calcPriceInput.addEventListener('input', function () {
      var bundle = getCurrentBundle();
      if (!bundle) {
        return;
      }
      bundle.calc.priceP = els.calcPriceInput.value;
      persistWorkspace();
      updateCalcOutputs(bundle);
      renderBundleCardsAndSummary();
    });

    els.calcCommInput.addEventListener('input', function () {
      var bundle = getCurrentBundle();
      if (!bundle) {
        return;
      }
      bundle.calc.r_comm = els.calcCommInput.value;
      persistWorkspace();
      updateCalcOutputs(bundle);
      renderBundleCardsAndSummary();
    });

    els.addBundleBtn.addEventListener('click', function () {
      var nextIndex = state.workspace.bundles.length + 1;
      var bundle = createBundle('套装' + nextIndex);
      state.workspace.bundles.push(bundle);
      state.workspace.currentBundleId = bundle.id;
      persistWorkspace();
      renderAll();
      setStatus('已新增套装。', 'ok');
    });

    els.copyBundleBtn.addEventListener('click', function () {
      var current = getCurrentBundle();
      if (!current) {
        return;
      }
      var clone = JSON.parse(JSON.stringify(current));
      clone.id = createId();
      clone.title = (current.title || '套装') + '（复制）';
      state.workspace.bundles.push(normalizeBundle(clone, state.workspace.bundles.length));
      state.workspace.currentBundleId = clone.id;
      persistWorkspace();
      renderAll();
      setStatus('已复制当前套装。', 'ok');
    });

    els.deleteBundleBtn.addEventListener('click', function () {
      var current = getCurrentBundle();
      if (!current) {
        return;
      }
      if (!window.confirm('确认删除当前套装吗？')) {
        return;
      }

      if (state.workspace.bundles.length === 1) {
        var fresh = createBundle('套装1');
        state.workspace.bundles = [fresh];
        state.workspace.currentBundleId = fresh.id;
      } else {
        state.workspace.bundles = state.workspace.bundles.filter(function (bundle) {
          return bundle.id !== current.id;
        });
        state.workspace.currentBundleId = state.workspace.bundles[0].id;
      }

      persistWorkspace();
      renderAll();
      setStatus('套装已删除。', 'warn');
    });

    els.bundleCards.addEventListener('click', function (event) {
      var card = event.target.closest('.bundle-card');
      if (!card) {
        return;
      }
      var bundleId = card.getAttribute('data-bundle-id');
      if (!bundleId) {
        return;
      }
      state.workspace.currentBundleId = bundleId;
      persistWorkspace();
      renderBundleEditor();
      renderBundleCardsAndSummary();
    });

    els.exportOpsBtn.addEventListener('click', function () {
      try {
        ExportService.exportOperation(state);
        setStatus('运营版 HTML 已导出。', 'ok');
      } catch (err) {
        setStatus('导出失败：' + err.message, 'error');
      }
    });

    els.previewOpsBtn.addEventListener('click', function () {
      try {
        ExportService.previewOperation(state);
      } catch (err) {
        setStatus('预览失败：' + err.message, 'error');
      }
    });

    els.exportHostBtn.addEventListener('click', function () {
      try {
        ExportService.exportStreamer(state);
        setStatus('主播版 HTML 已导出。', 'ok');
      } catch (err) {
        setStatus('导出失败：' + err.message, 'error');
      }
    });

    els.previewHostBtn.addEventListener('click', function () {
      try {
        ExportService.previewStreamer(state);
      } catch (err) {
        setStatus('预览失败：' + err.message, 'error');
      }
    });

    els.exportNormalBtn.addEventListener('click', function () {
      try {
        ExportService.exportStandard(state);
        setStatus('普通版 HTML 已导出。', 'ok');
      } catch (err) {
        setStatus('导出失败：' + err.message, 'error');
      }
    });

    els.previewNormalBtn.addEventListener('click', function () {
      try {
        ExportService.previewStandard(state);
      } catch (err) {
        setStatus('预览失败：' + err.message, 'error');
      }
    });
  }

  async function handleCsvFileChange(event) {
    var file = event.target.files && event.target.files[0];
    if (!file) {
      return;
    }

    try {
      var text = await file.text();
      var result = CSVUtils.importProducts(text);
      state.products = result.products;
      state.productsUpdatedAt = Date.now();
      rebuildProductMap();
      AppStorage.saveProducts(state.products, state.productsUpdatedAt);
      renderAll();

      var message = 'CSV 导入完成：' + state.products.length + ' 个 SKU。';
      if (result.warnings.length > 0) {
        message += ' 警告 ' + result.warnings.length + ' 条（示例：' + result.warnings.slice(0, 2).join('；') + '）。';
        setStatus(message, 'warn');
      } else {
        setStatus(message, 'ok');
      }
    } catch (err) {
      setStatus('CSV 导入失败：' + err.message, 'error');
    } finally {
      els.csvFileInput.value = '';
    }
  }

  function loadState() {
    var productCache = AppStorage.loadProducts();
    state.products = Array.isArray(productCache.products) ? productCache.products : [];
    state.productsUpdatedAt = productCache.updatedAt || null;

    var workspace = AppStorage.loadWorkspace();
    if (workspace && Array.isArray(workspace.bundles)) {
      state.workspace.bundles = workspace.bundles.map(normalizeBundle);
      state.workspace.currentBundleId = typeof workspace.currentBundleId === 'string'
        ? workspace.currentBundleId
        : '';
    } else {
      state.workspace.bundles = [];
      state.workspace.currentBundleId = '';
    }
  }

  function ensureWorkspace() {
    if (!Array.isArray(state.workspace.bundles) || state.workspace.bundles.length === 0) {
      var first = createBundle('套装1');
      state.workspace.bundles = [first];
      state.workspace.currentBundleId = first.id;
      persistWorkspace();
      return;
    }

    if (!getCurrentBundle()) {
      state.workspace.currentBundleId = state.workspace.bundles[0].id;
      persistWorkspace();
    }
  }

  function persistWorkspace() {
    AppStorage.saveWorkspace(state.workspace);
  }

  function rebuildProductMap() {
    productMap = new Map();
    state.products.forEach(function (product) {
      if (!product || !product.product_id) {
        return;
      }
      productMap.set(String(product.product_id), {
        product_id: String(product.product_id),
        product_name: String(product.product_name || product.product_id),
        cost: toFinite(product.cost, 0),
        image_url: String(product.image_url || ''),
        stock: Math.max(0, Math.floor(toFinite(product.stock, 0)))
      });
    });
  }

  function renderAll() {
    renderTopMeta();
    renderProductList();
    renderBundleEditor();
    renderBundleCardsAndSummary();
  }

  function renderTopMeta() {
    els.skuCount.textContent = String(state.products.length);
    els.skuUpdatedAt.textContent = formatDateTime(state.productsUpdatedAt);
  }

  function renderProductList() {
    var keyword = String(els.productSearchInput.value || '').trim().toLowerCase();
    var filtered = state.products.filter(function (product) {
      if (!keyword) {
        return true;
      }
      var id = String(product.product_id || '').toLowerCase();
      var name = String(product.product_name || '').toLowerCase();
      return id.indexOf(keyword) >= 0 || name.indexOf(keyword) >= 0;
    });

    if (filtered.length === 0) {
      els.productList.innerHTML = '<div class="empty-block">暂无匹配产品。</div>';
      return;
    }

    els.productList.innerHTML = filtered.map(function (product) {
      var img = product.image_url
        ? '<img class="thumb" src="' + escapeHtml(product.image_url) + '" alt="" />'
        : '<div class="thumb thumb-empty">无图</div>';

      return [
        '<article class="product-item">',
        img,
        '<div class="product-main">',
        '<div class="product-name">' + escapeHtml(product.product_name || product.product_id) + '</div>',
        '<div class="product-meta">ID: ' + escapeHtml(product.product_id) + '</div>',
        '<div class="product-meta">成本: ' + formatMoney(toFinite(product.cost, 0)) + ' ｜ 库存: ' + formatInt(product.stock) + '</div>',
        '</div>',
        '<button class="btn btn-sm add-product-btn" data-product-id="' + escapeHtml(product.product_id) + '">加入</button>',
        '</article>'
      ].join('');
    }).join('');
  }

  function renderBundleEditor() {
    var bundle = getCurrentBundle();
    if (!bundle) {
      return;
    }

    els.bundleTitleInput.value = bundle.title;
    els.bundleNotesInput.value = bundle.notes;
    renderBundleItems(bundle);
    renderCalcForm(bundle);
  }

  function renderBundleItems(bundle) {
    var rows = [];
    var computed = getBundleComputed(bundle);

    if (bundle.items.length === 0) {
      rows.push('<tr><td colspan="6" class="empty-row">从左侧产品库点击“加入”添加商品。</td></tr>');
    } else {
      bundle.items.forEach(function (item, index) {
        var product = productMap.get(String(item.product_id));
        var qty = normalizeQty(item.qty);
        var cost = product ? toFinite(product.cost, 0) : 0;
        var stock = product ? Math.max(0, Math.floor(toFinite(product.stock, 0))) : 0;
        var name = product ? product.product_name : ('[缺失SKU] ' + item.product_id);
        var rowClass = product ? '' : 'missing';

        rows.push([
          '<tr class="' + rowClass + '">',
          '<td class="product-cell">' + escapeHtml(name) + '</td>',
          '<td>' + formatMoney(cost) + '</td>',
          '<td>' + formatInt(stock) + '</td>',
          '<td><input class="qty-input" data-index="' + index + '" type="number" min="1" step="1" value="' + qty + '" /></td>',
          '<td>' + formatMoney(cost * qty) + '</td>',
          '<td><button class="btn btn-sm btn-outline-danger remove-item-btn" data-index="' + index + '">删除</button></td>',
          '</tr>'
        ].join(''));
      });
    }

    rows.push([
      '<tr class="sum-row">',
      '<td colspan="4">成本合计 C_base</td>',
      '<td colspan="2">' + formatMoney(computed.C_base) + '</td>',
      '</tr>'
    ].join(''));

    els.bundleItemsBody.innerHTML = rows.join('');
  }

  function renderCalcForm(bundle) {
    els.calcPriceInput.value = bundle.calc.priceP;
    els.calcCommInput.value = bundle.calc.r_comm;
    updateCalcOutputs(bundle);
  }

  function updateCalcOutputs(bundle) {
    var computed = getBundleComputed(bundle);
    var metrics = computed.metrics;
    var stock = computed.stock;

    els.outCBase.textContent = formatMoney(computed.C_base);

    if (metrics.valid) {
      els.outPrice.textContent = formatMoney(metrics.P);
      els.outFee.textContent = formatMoney(metrics.Fee);
      els.outCommissionAmount.textContent = formatMoney(metrics.Commission);
      els.outCommissionRate.textContent = formatPct(metrics.r_comm);
      els.outCActual.textContent = formatMoney(metrics.C_actual);
      els.outProfit.textContent = formatMoney(metrics.Profit);
      els.outProfitRate.textContent = formatPct(metrics.ProfitRate);
      els.outMaxGmv.textContent = formatMoney(stock.gmv);
      els.outMaxCommission.textContent = formatMoney(stock.commissionBudget);
      els.outMaxProfit.textContent = formatMoney(stock.profitCapacity);
    } else {
      els.outPrice.textContent = '--';
      els.outFee.textContent = '--';
      els.outCommissionAmount.textContent = '--';
      els.outCommissionRate.textContent = '--';
      els.outCActual.textContent = '--';
      els.outProfit.textContent = '--';
      els.outProfitRate.textContent = '--';
      els.outMaxGmv.textContent = '--';
      els.outMaxCommission.textContent = '--';
      els.outMaxProfit.textContent = '--';
    }

    els.outMaxSets.textContent = formatInt(stock.maxSets);

    var warnings = [];
    if (!metrics.valid && metrics.message) {
      warnings.push(metrics.message);
    } else if (metrics.message) {
      warnings.push(metrics.message);
    }

    if (warnings.length > 0) {
      els.calcWarning.textContent = warnings.join(' ');
      els.calcWarning.classList.add('show');
      els.calcWarning.classList.toggle('danger', metrics.impossible || metrics.loss);
    } else {
      els.calcWarning.textContent = '';
      els.calcWarning.classList.remove('show');
      els.calcWarning.classList.remove('danger');
    }
  }

  function renderBundleCardsAndSummary() {
    var bundles = state.workspace.bundles;
    var totalMaxSets = 0;
    var totalGmv = 0;
    var totalCommission = 0;
    var totalProfit = 0;

    els.bundleCards.innerHTML = bundles.map(function (bundle, index) {
      var computed = getBundleComputed(bundle);
      var metrics = computed.metrics;
      var stock = computed.stock;

      totalMaxSets += toFinite(stock.maxSets, 0);
      totalGmv += toFinite(stock.gmv, 0);
      totalCommission += toFinite(stock.commissionBudget, 0);
      totalProfit += toFinite(stock.profitCapacity, 0);

      var title = bundle.title && bundle.title.trim() ? bundle.title : ('套装' + (index + 1));
      var active = bundle.id === state.workspace.currentBundleId ? 'active' : '';
      var loss = metrics.loss ? 'loss' : '';
      var price = metrics.valid ? formatMoney(metrics.P) : '--';
      var profitRate = metrics.valid ? formatPct(metrics.ProfitRate) : '--';
      var info = metrics.valid ? '' : '<div class="bundle-info muted">参数未完整</div>';

      return [
        '<article class="bundle-card ' + active + ' ' + loss + '" data-bundle-id="' + escapeHtml(bundle.id) + '">',
        '<div class="bundle-title">' + escapeHtml(title) + '</div>',
        '<div class="bundle-info">SKU: ' + formatInt(bundle.items.length) + ' ｜ C_base: ' + formatMoney(computed.C_base) + '</div>',
        '<div class="bundle-info">售价: ' + price + ' ｜ 利润率: ' + profitRate + '</div>',
        '<div class="bundle-info">最大可卖: ' + formatInt(stock.maxSets) + ' 套 ｜ 可撑GMV: ' + formatMoney(stock.gmv) + '</div>',
        info,
        '</article>'
      ].join('');
    }).join('');

    els.sumBundleCount.textContent = formatInt(bundles.length);
    els.sumMaxSets.textContent = formatInt(totalMaxSets);
    els.sumGmv.textContent = formatMoney(totalGmv);
    els.sumCommission.textContent = formatMoney(totalCommission);
    els.sumProfit.textContent = formatMoney(totalProfit);
  }

  function addProductToCurrentBundle(productId) {
    var bundle = getCurrentBundle();
    if (!bundle) {
      return;
    }
    var id = String(productId || '').trim();
    if (!id) {
      return;
    }

    var existed = bundle.items.find(function (item) {
      return String(item.product_id) === id;
    });

    if (existed) {
      existed.qty = normalizeQty(existed.qty + 1);
    } else {
      bundle.items.push({ product_id: id, qty: 1 });
    }

    persistWorkspace();
    renderBundleEditor();
    renderBundleCardsAndSummary();
  }

  function getBundleComputed(bundle) {
    var CBase = CalcEngine.computeBaseCost(bundle.items, productMap);
    var metrics = CalcEngine.calculate('quick', {
      P: parseMoney(bundle.calc.priceP),
      r_comm: parseRate(bundle.calc.r_comm),
      C_base: CBase
    });
    var stock = CalcEngine.inferStock(bundle.items, productMap, metrics);

    return {
      C_base: CBase,
      metrics: metrics,
      stock: stock
    };
  }

  function getCurrentBundle() {
    var bundles = state.workspace.bundles;
    for (var i = 0; i < bundles.length; i += 1) {
      if (bundles[i].id === state.workspace.currentBundleId) {
        return bundles[i];
      }
    }
    return bundles[0] || null;
  }

  function createBundle(title) {
    return {
      id: createId(),
      title: title || '',
      notes: '',
      items: [],
      calc: {
        priceP: '',
        r_comm: ''
      }
    };
  }

  function normalizeBundle(bundle, index) {
    var safe = bundle && typeof bundle === 'object' ? bundle : {};
    var calc = safe.calc && typeof safe.calc === 'object' ? safe.calc : {};

    var items = Array.isArray(safe.items) ? safe.items : [];
    return {
      id: typeof safe.id === 'string' && safe.id ? safe.id : createId(),
      title: typeof safe.title === 'string' ? safe.title : ('套装' + (index + 1)),
      notes: typeof safe.notes === 'string' ? safe.notes : '',
      items: items
        .filter(function (item) { return item && item.product_id; })
        .map(function (item) {
          return {
            product_id: String(item.product_id),
            qty: normalizeQty(item.qty)
          };
        }),
      calc: {
        priceP: toText(calc.priceP),
        r_comm: toText(calc.r_comm)
      }
    };
  }

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
    var qty = Math.floor(Number(value));
    if (!Number.isFinite(qty) || qty < 1) {
      return 1;
    }
    return qty;
  }

  function toFinite(value, fallback) {
    var num = Number(value);
    return Number.isFinite(num) ? num : fallback;
  }

  function toText(value) {
    return value == null ? '' : String(value);
  }

  function createId() {
    return 'bundle_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
  }

  function formatMoney(value) {
    var num = Number(value);
    return Number.isFinite(num) ? ('¥' + num.toFixed(2)) : '--';
  }

  function formatPct(value) {
    var num = Number(value);
    return Number.isFinite(num) ? ((num * 100).toFixed(2) + '%') : '--';
  }

  function formatInt(value) {
    var num = Math.floor(Number(value));
    return Number.isFinite(num) ? String(num) : '0';
  }

  function formatDateTime(timestamp) {
    if (!timestamp) {
      return '未导入';
    }
    var date = new Date(Number(timestamp));
    if (Number.isNaN(date.getTime())) {
      return '未导入';
    }
    return date.toLocaleString('zh-CN', { hour12: false });
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function setStatus(message, level) {
    clearTimeout(statusTimer);
    els.statusBar.textContent = message || '';
    els.statusBar.classList.remove('is-error', 'is-ok', 'is-warn');

    if (level === 'error') {
      els.statusBar.classList.add('is-error');
    } else if (level === 'warn') {
      els.statusBar.classList.add('is-warn');
    } else if (level === 'ok') {
      els.statusBar.classList.add('is-ok');
    }

    if (message) {
      statusTimer = setTimeout(function () {
        els.statusBar.textContent = '';
        els.statusBar.classList.remove('is-error', 'is-ok', 'is-warn');
      }, 6000);
    }
  }
})(window);
