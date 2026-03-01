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
    els.exportJsonBackupBtn = document.getElementById('exportJsonBackupBtn');
    els.importJsonBackupBtn = document.getElementById('importJsonBackupBtn');
    els.jsonBackupInput = document.getElementById('jsonBackupInput');
    els.statusBar = document.getElementById('statusBar');

    els.productSearchInput = document.getElementById('productSearchInput');
    els.productList = document.getElementById('productList');

    els.bundleTitleInput = document.getElementById('bundleTitleInput');
    els.bundleItemsBody = document.getElementById('bundleItemsBody');
    els.bundleNotesInput = document.getElementById('bundleNotesInput');

    els.calcPriceInput = document.getElementById('calcPriceInput');
    els.calcCommInput = document.getElementById('calcCommInput');
    els.calcFeeInput = document.getElementById('calcFeeInput');

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
    els.sumRemainingSets = document.getElementById('sumRemainingSets');
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

    els.productList.addEventListener('input', function (event) {
      if (!event.target.classList.contains('stock-quick-input')) {
        return;
      }
      var focusSnapshot = captureNumericInputFocus(event.target);
      updateProductStock(event.target.getAttribute('data-product-id'), event.target.value, focusSnapshot);
    });

    els.bundleItemsBody.addEventListener('input', function (event) {
      if (!event.target.classList.contains('qty-input')) {
        return;
      }
      var focusSnapshot = captureNumericInputFocus(event.target);
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
      restoreNumericInputFocus(focusSnapshot);
    });

    els.bundleItemsBody.addEventListener('input', function (event) {
      if (!event.target.classList.contains('stock-inline-input')) {
        return;
      }
      var focusSnapshot = captureNumericInputFocus(event.target);
      updateProductStock(event.target.getAttribute('data-product-id'), event.target.value, focusSnapshot);
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

    els.calcFeeInput.addEventListener('input', function () {
      var bundle = getCurrentBundle();
      if (!bundle) {
        return;
      }
      bundle.calc.r_fee = els.calcFeeInput.value;
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
      if (event.target.closest('input, textarea, select, button, label')) {
        return;
      }
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

    els.bundleCards.addEventListener('input', function (event) {
      if (!event.target.classList.contains('sold-sets-input')) {
        return;
      }
      var focusSnapshot = captureNumericInputFocus(event.target);
      var bundleId = event.target.getAttribute('data-bundle-id');
      var bundle = getBundleById(bundleId);
      if (!bundle) {
        return;
      }
      bundle.soldSets = normalizeNonNegativeInt(event.target.value, 0);
      persistWorkspace();
      renderBundleCardsAndSummary();
      restoreNumericInputFocus(focusSnapshot);
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

    els.exportJsonBackupBtn.addEventListener('click', function () {
      try {
        var payload = createBackupPayload();
        var filename = '货盘备份_' + formatFileTime(new Date()) + '.json';
        downloadJson(filename, payload);
        setStatus('JSON 备份已导出。', 'ok');
      } catch (err) {
        setStatus('JSON 备份导出失败：' + err.message, 'error');
      }
    });

    els.importJsonBackupBtn.addEventListener('click', function () {
      els.jsonBackupInput.click();
    });

    els.jsonBackupInput.addEventListener('change', handleJsonBackupFileChange);
  }

  function hasUtf8Bom(bytes) {
    return bytes.length >= 3
      && bytes[0] === 0xEF
      && bytes[1] === 0xBB
      && bytes[2] === 0xBF;
  }

  function getSupportedGbEncoding() {
    var candidates = ['gb18030', 'gbk'];
    for (var i = 0; i < candidates.length; i += 1) {
      try {
        new TextDecoder(candidates[i]);
        return candidates[i];
      } catch (err) {
        // ignore unsupported encoding
      }
    }
    return '';
  }

  function tryImportProductsByEncoding(bytes, encoding, options) {
    try {
      var decoder = new TextDecoder(encoding, options || {});
      var text = decoder.decode(bytes);
      var result = CSVUtils.importProducts(text);
      return {
        ok: true,
        encoding: encoding,
        result: result
      };
    } catch (err) {
      return {
        ok: false,
        encoding: encoding,
        error: err
      };
    }
  }

  function getEncodingLabel(encoding) {
    if (encoding === 'utf-8') {
      return 'UTF-8';
    }
    if (encoding === 'gb18030' || encoding === 'gbk') {
      return 'GBK';
    }
    return String(encoding || '').toUpperCase();
  }

  function buildCsvImportError(utfError, gbError) {
    if (gbError) {
      return new Error('无法按 UTF-8 或 GBK 解析该 CSV。UTF-8：' + utfError.message + '；GBK：' + gbError.message);
    }
    return utfError;
  }

  async function importCsvWithEncodingFallback(file) {
    if (typeof TextDecoder !== 'function' || typeof file.arrayBuffer !== 'function') {
      var fallbackText = await file.text();
      return {
        encoding: 'utf-8',
        result: CSVUtils.importProducts(fallbackText)
      };
    }

    var bytes = new Uint8Array(await file.arrayBuffer());
    var utfOptions = hasUtf8Bom(bytes) ? {} : { fatal: true };
    var utfResult = tryImportProductsByEncoding(bytes, 'utf-8', utfOptions);
    if (utfResult.ok) {
      return {
        encoding: utfResult.encoding,
        result: utfResult.result
      };
    }

    var gbEncoding = getSupportedGbEncoding();
    if (!gbEncoding) {
      throw utfResult.error;
    }

    var gbResult = tryImportProductsByEncoding(bytes, gbEncoding, {});
    if (gbResult.ok) {
      return {
        encoding: gbResult.encoding,
        result: gbResult.result
      };
    }

    throw buildCsvImportError(utfResult.error, gbResult.error);
  }

  async function handleCsvFileChange(event) {
    var file = event.target.files && event.target.files[0];
    if (!file) {
      return;
    }

    try {
      var imported = await importCsvWithEncodingFallback(file);
      var result = imported.result;
      state.products = result.products;
      state.productsUpdatedAt = Date.now();
      rebuildProductMap();
      AppStorage.saveProducts(state.products, state.productsUpdatedAt);
      renderAll();

      var message = 'CSV 导入完成：' + state.products.length + ' 个 SKU（编码：' + getEncodingLabel(imported.encoding) + '）。';
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

  async function handleJsonBackupFileChange(event) {
    var file = event.target.files && event.target.files[0];
    if (!file) {
      return;
    }

    try {
      var text = await file.text();
      var parsed = JSON.parse(text);
      var backup = normalizeBackup(parsed);

      if (!window.confirm('导入 JSON 备份会覆盖当前货盘，是否继续？')) {
        return;
      }

      state.products = backup.products;
      state.productsUpdatedAt = backup.productsUpdatedAt;
      state.workspace.bundles = backup.workspace.bundles.map(normalizeBundle);
      state.workspace.currentBundleId = backup.workspace.currentBundleId;

      ensureWorkspace();
      rebuildProductMap();
      AppStorage.saveProducts(state.products, state.productsUpdatedAt);
      persistWorkspace();
      renderAll();
      setStatus('JSON 备份导入成功：' + state.workspace.bundles.length + ' 个套装，' + state.products.length + ' 个 SKU。', 'ok');
    } catch (err) {
      setStatus('JSON 备份导入失败：' + err.message, 'error');
    } finally {
      els.jsonBackupInput.value = '';
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
    var remainingStockMap = buildRemainingStockContext().remainingStockMap;
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
      var totalStock = Math.max(0, Math.floor(toFinite(product.stock, 0)));
      var remainingStock = Math.max(
        0,
        Math.floor(remainingStockMap.has(String(product.product_id))
          ? toFinite(remainingStockMap.get(String(product.product_id)), 0)
          : totalStock)
      );

      return [
        '<article class="product-item">',
        img,
        '<div class="product-main">',
        '<div class="product-name">' + escapeHtml(product.product_name || product.product_id) + '</div>',
        '<div class="product-meta">ID: ' + escapeHtml(product.product_id) + '</div>',
        '<div class="product-meta">成本: ' + formatMoney(toFinite(product.cost, 0)) + '</div>',
        '<label class="product-meta product-stock-edit">总库存:',
        '<input class="stock-quick-input" data-product-id="' + escapeHtml(product.product_id) + '" type="number" min="0" step="1" value="' + totalStock + '" />',
        '</label>',
        '<div class="product-meta stock-meta">剩余: ' + formatInt(remainingStock) + '</div>',
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
    var remainingStockMap = buildRemainingStockContext().remainingStockMap;

    if (bundle.items.length === 0) {
      rows.push('<tr><td colspan="7" class="empty-row">从左侧产品库点击“加入”添加商品。</td></tr>');
    } else {
      bundle.items.forEach(function (item, index) {
        var product = productMap.get(String(item.product_id));
        var qty = normalizeQty(item.qty);
        var cost = product ? toFinite(product.cost, 0) : 0;
        var totalStock = product ? Math.max(0, Math.floor(toFinite(product.stock, 0))) : 0;
        var remainingStock = Math.max(
          0,
          Math.floor(remainingStockMap.has(String(item.product_id))
            ? toFinite(remainingStockMap.get(String(item.product_id)), 0)
            : totalStock)
        );
        var name = product ? product.product_name : ('[缺失SKU] ' + item.product_id);
        var rowClass = product ? '' : 'missing';
        var imageNode = product && product.image_url
          ? '<img class="thumb" src="' + escapeHtml(product.image_url) + '" alt="" />'
          : '<div class="thumb thumb-empty">无图</div>';

        rows.push([
          '<tr class="' + rowClass + '">',
          '<td>' + imageNode + '</td>',
          '<td class="product-cell">' + escapeHtml(name) + '</td>',
          '<td>' + formatMoney(cost) + '</td>',
          '<td><div class="stock-cell"><input class="stock-inline-input" data-product-id="' + escapeHtml(item.product_id) + '" type="number" min="0" step="1" value="' + formatInt(totalStock) + '" ' + (product ? '' : 'disabled') + ' /><span class="stock-sub">余 ' + formatInt(remainingStock) + '</span></div></td>',
          '<td><input class="qty-input" data-index="' + index + '" type="number" min="1" step="1" value="' + qty + '" /></td>',
          '<td>' + formatMoney(cost * qty) + '</td>',
          '<td><button class="btn btn-sm btn-outline-danger remove-item-btn" data-index="' + index + '">删除</button></td>',
          '</tr>'
        ].join(''));
      });
    }

    rows.push([
      '<tr class="sum-row">',
      '<td colspan="5">成本合计</td>',
      '<td colspan="2">' + formatMoney(computed.C_base) + '</td>',
      '</tr>'
    ].join(''));

    els.bundleItemsBody.innerHTML = rows.join('');
  }

  function renderCalcForm(bundle) {
    els.calcPriceInput.value = bundle.calc.priceP;
    els.calcCommInput.value = bundle.calc.r_comm;
    els.calcFeeInput.value = bundle.calc.r_fee;
    updateCalcOutputs(bundle);
  }

  function updateCalcOutputs(bundle) {
    var computed = getBundleComputed(bundle);
    var metrics = computed.metrics;
    var remainingContext = buildRemainingStockContext();
    var remainingStockMap = remainingContext.remainingStockMap;
    var dynamicStock = getDynamicStockForBundle(bundle, remainingStockMap, metrics);
    var hasDeficit = hasBundleStockDeficit(bundle, remainingStockMap);

    els.outCBase.textContent = formatMoney(computed.C_base);

    if (metrics.valid) {
      els.outPrice.textContent = formatMoney(metrics.P);
      els.outFee.textContent = formatMoney(metrics.Fee);
      els.outCommissionAmount.textContent = formatMoney(metrics.Commission);
      els.outCommissionRate.textContent = formatPct(metrics.r_comm);
      els.outCActual.textContent = formatMoney(metrics.C_actual);
      els.outProfit.textContent = formatMoney(metrics.Profit);
      els.outProfitRate.textContent = formatPct(metrics.ProfitRate);
      els.outMaxGmv.textContent = formatMoney(dynamicStock.gmv);
      els.outMaxCommission.textContent = formatMoney(dynamicStock.commissionBudget);
      els.outMaxProfit.textContent = formatMoney(dynamicStock.profitCapacity);
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

    els.outMaxSets.textContent = formatInt(dynamicStock.maxSets);

    var warnings = [];
    if (!metrics.valid && metrics.message) {
      warnings.push(metrics.message);
    } else if (metrics.message) {
      warnings.push(metrics.message);
    }
    if (hasDeficit) {
      warnings.push('涉及 SKU 已超卖，请先调整已售套数或库存。');
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
    var totalTheoryMaxSets = 0;
    var totalRemainingSets = 0;
    var totalGmv = 0;
    var totalCommission = 0;
    var totalProfit = 0;
    var remainingContext = buildRemainingStockContext();
    var remainingStockMap = remainingContext.remainingStockMap;

    els.bundleCards.innerHTML = bundles.map(function (bundle, index) {
      var computed = getBundleComputed(bundle);
      var metrics = computed.metrics;
      var stock = computed.stock;
      var soldSets = normalizeNonNegativeInt(bundle.soldSets, 0);
      var remainingSets = getRemainingSetsForBundle(bundle, remainingStockMap);
      var deficit = hasBundleStockDeficit(bundle, remainingStockMap);
      var dynamicStock = getDynamicStockForBundle(bundle, remainingStockMap, metrics);

      totalTheoryMaxSets += toFinite(stock.maxSets, 0);
      totalRemainingSets += toFinite(remainingSets, 0);
      totalGmv += toFinite(dynamicStock.gmv, 0);
      totalCommission += toFinite(dynamicStock.commissionBudget, 0);
      totalProfit += toFinite(dynamicStock.profitCapacity, 0);

      var title = bundle.title && bundle.title.trim() ? bundle.title : ('套装' + (index + 1));
      var active = bundle.id === state.workspace.currentBundleId ? 'active' : '';
      var loss = metrics.loss ? 'loss' : '';
      var stockDeficit = deficit ? 'stock-deficit' : '';
      var price = metrics.valid ? formatMoney(metrics.P) : '--';
      var profitRate = metrics.valid ? formatPct(metrics.ProfitRate) : '--';
      var info = metrics.valid ? '' : '<div class="bundle-info muted">参数未完整</div>';
      var deficitInfo = deficit
        ? '<div class="bundle-info muted">SKU 已超卖，请调整已售或库存。</div>'
        : '';

      return [
        '<article class="bundle-card ' + active + ' ' + loss + ' ' + stockDeficit + '" data-bundle-id="' + escapeHtml(bundle.id) + '">',
        '<div class="bundle-title">' + escapeHtml(title) + '</div>',
        '<div class="bundle-info">SKU 数: ' + formatInt(bundle.items.length) + ' ｜ 成本合计: ' + formatMoney(computed.C_base) + '</div>',
        '<div class="bundle-info">售价: ' + price + ' ｜ 利润率: ' + profitRate + '</div>',
        '<div class="bundle-info">理论: ' + formatInt(stock.maxSets) + ' 套 ｜ 动态剩余: ' + formatInt(remainingSets) + ' 套</div>',
        '<label class="bundle-inline-edit">已售套数',
        '<input class="sold-sets-input" data-bundle-id="' + escapeHtml(bundle.id) + '" type="number" min="0" step="1" value="' + soldSets + '" />',
        '</label>',
        '<div class="bundle-info">动态GMV: ' + formatMoney(dynamicStock.gmv) + ' ｜ 动态利润: ' + formatMoney(dynamicStock.profitCapacity) + '</div>',
        info,
        deficitInfo,
        '</article>'
      ].join('');
    }).join('');

    els.sumBundleCount.textContent = formatInt(bundles.length);
    els.sumMaxSets.textContent = formatInt(totalTheoryMaxSets);
    els.sumRemainingSets.textContent = formatInt(totalRemainingSets);
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
      r_fee: parseRate(bundle.calc.r_fee, defaultFeeRateValue()),
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

  function getBundleById(bundleId) {
    var id = String(bundleId || '');
    var bundles = state.workspace.bundles;
    for (var i = 0; i < bundles.length; i += 1) {
      if (String(bundles[i].id) === id) {
        return bundles[i];
      }
    }
    return null;
  }

  function createBundle(title) {
    return {
      id: createId(),
      title: title || '',
      notes: '',
      items: [],
      soldSets: 0,
      calc: {
        priceP: '',
        r_comm: '',
        r_fee: defaultFeeRateText()
      }
    };
  }

  function normalizeBundle(bundle, index) {
    var safe = bundle && typeof bundle === 'object' ? bundle : {};
    var calc = safe.calc && typeof safe.calc === 'object' ? safe.calc : {};
    var feeText = toText(calc.r_fee).trim();
    if (!feeText) {
      feeText = defaultFeeRateText();
    }

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
      soldSets: normalizeNonNegativeInt(safe.soldSets, 0),
      calc: {
        priceP: toText(calc.priceP),
        r_comm: toText(calc.r_comm),
        r_fee: feeText
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

  function parseRate(value, fallback) {
    var text = String(value == null ? '' : value).trim();
    if (!text) {
      return Number.isFinite(fallback) ? fallback : NaN;
    }
    var num = parseMoney(text);
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

  function normalizeNonNegativeInt(value, fallback) {
    var num = Math.floor(Number(value));
    if (!Number.isFinite(num) || num < 0) {
      return toFinite(fallback, 0);
    }
    return num;
  }

  function captureNumericInputFocus(input) {
    if (!input || !input.classList) {
      return null;
    }

    var trackedClass = '';
    if (input.classList.contains('stock-quick-input')) {
      trackedClass = 'stock-quick-input';
    } else if (input.classList.contains('stock-inline-input')) {
      trackedClass = 'stock-inline-input';
    } else if (input.classList.contains('qty-input')) {
      trackedClass = 'qty-input';
    } else if (input.classList.contains('sold-sets-input')) {
      trackedClass = 'sold-sets-input';
    }

    if (!trackedClass) {
      return null;
    }

    var selectionStart = null;
    var selectionEnd = null;
    try {
      selectionStart = input.selectionStart;
      selectionEnd = input.selectionEnd;
    } catch (err) {
      // selectionStart is unsupported on some number inputs.
    }

    return {
      trackedClass: trackedClass,
      productId: input.getAttribute('data-product-id'),
      index: input.getAttribute('data-index'),
      bundleId: input.getAttribute('data-bundle-id'),
      selectionStart: selectionStart,
      selectionEnd: selectionEnd
    };
  }

  function findNumericInputByFocus(snapshot) {
    if (!snapshot || !snapshot.trackedClass) {
      return null;
    }

    var nodes = document.querySelectorAll('.' + snapshot.trackedClass);
    for (var i = 0; i < nodes.length; i += 1) {
      var node = nodes[i];
      if (snapshot.productId != null && node.getAttribute('data-product-id') !== snapshot.productId) {
        continue;
      }
      if (snapshot.index != null && node.getAttribute('data-index') !== snapshot.index) {
        continue;
      }
      if (snapshot.bundleId != null && node.getAttribute('data-bundle-id') !== snapshot.bundleId) {
        continue;
      }
      return node;
    }
    return null;
  }

  function restoreNumericInputFocus(snapshot) {
    var input = findNumericInputByFocus(snapshot);
    if (!input) {
      return;
    }

    try {
      input.focus({ preventScroll: true });
    } catch (err) {
      input.focus();
    }

    if (
      typeof snapshot.selectionStart === 'number'
      && typeof snapshot.selectionEnd === 'number'
      && typeof input.setSelectionRange === 'function'
    ) {
      try {
        input.setSelectionRange(snapshot.selectionStart, snapshot.selectionEnd);
      } catch (err) {
        // ignore unsupported selection restoration
      }
    }
  }

  function updateProductStock(productId, nextStockRaw, focusSnapshot) {
    var id = String(productId || '').trim();
    if (!id) {
      return;
    }
    var nextStock = normalizeNonNegativeInt(nextStockRaw, 0);
    var changed = false;

    state.products = state.products.map(function (product) {
      if (!product || String(product.product_id) !== id) {
        return product;
      }
      var currentStock = normalizeNonNegativeInt(product.stock, 0);
      if (currentStock === nextStock) {
        return product;
      }
      changed = true;
      var clone = {};
      Object.keys(product).forEach(function (key) {
        clone[key] = product[key];
      });
      clone.stock = nextStock;
      return clone;
    });

    if (!changed) {
      return;
    }

    state.productsUpdatedAt = Date.now();
    rebuildProductMap();
    AppStorage.saveProducts(state.products, state.productsUpdatedAt);
    renderAll();
    restoreNumericInputFocus(focusSnapshot);
  }

  function buildRemainingStockContext() {
    var remainingStockMap = new Map();
    productMap.forEach(function (product, productId) {
      remainingStockMap.set(String(productId), normalizeNonNegativeInt(product.stock, 0));
    });

    state.workspace.bundles.forEach(function (bundle) {
      var soldSets = normalizeNonNegativeInt(bundle.soldSets, 0);
      if (!(soldSets > 0)) {
        return;
      }
      bundle.items.forEach(function (item) {
        var id = String(item.product_id || '');
        if (!id || !remainingStockMap.has(id)) {
          return;
        }
        var qty = normalizeQty(item.qty);
        var remain = toFinite(remainingStockMap.get(id), 0);
        remainingStockMap.set(id, remain - soldSets * qty);
      });
    });

    return {
      remainingStockMap: remainingStockMap
    };
  }

  function getRemainingSetsForBundle(bundle, remainingStockMap) {
    var items = Array.isArray(bundle && bundle.items) ? bundle.items : [];
    if (items.length === 0) {
      return 0;
    }

    var maxSets = Infinity;
    var hasValidSku = false;

    items.forEach(function (item) {
      var id = String(item && item.product_id || '');
      if (!id) {
        return;
      }
      hasValidSku = true;
      var qty = normalizeQty(item.qty);
      var remaining = remainingStockMap.has(id) ? toFinite(remainingStockMap.get(id), 0) : 0;
      var available = Math.max(0, Math.floor(remaining));
      maxSets = Math.min(maxSets, Math.floor(available / qty));
    });

    if (!hasValidSku || !Number.isFinite(maxSets) || maxSets < 0) {
      return 0;
    }
    return maxSets;
  }

  function getDynamicStockForBundle(bundle, remainingStockMap, metrics) {
    var remainingSets = getRemainingSetsForBundle(bundle, remainingStockMap);
    var gmv = 0;
    var commissionBudget = 0;
    var profitCapacity = 0;

    if (metrics && metrics.valid) {
      gmv = remainingSets * toFinite(metrics.P, 0);
      commissionBudget = remainingSets * toFinite(metrics.Commission, 0);
      profitCapacity = remainingSets * toFinite(metrics.Profit, 0);
    }

    return {
      maxSets: remainingSets,
      gmv: gmv,
      commissionBudget: commissionBudget,
      profitCapacity: profitCapacity
    };
  }

  function hasBundleStockDeficit(bundle, remainingStockMap) {
    var items = Array.isArray(bundle && bundle.items) ? bundle.items : [];
    for (var i = 0; i < items.length; i += 1) {
      var id = String(items[i] && items[i].product_id || '');
      if (!id) {
        continue;
      }
      var remain = remainingStockMap.has(id) ? toFinite(remainingStockMap.get(id), 0) : 0;
      if (remain < 0) {
        return true;
      }
    }
    return false;
  }

  function toFinite(value, fallback) {
    var num = Number(value);
    return Number.isFinite(num) ? num : fallback;
  }

  function toText(value) {
    return value == null ? '' : String(value);
  }

  function defaultFeeRateValue() {
    var rate = Number(CalcEngine && CalcEngine.DEFAULT_FEE_RATE);
    return Number.isFinite(rate) ? rate : 0.07;
  }

  function defaultFeeRateText() {
    return String(Number((defaultFeeRateValue() * 100).toFixed(6)));
  }

  function createId() {
    return 'bundle_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
  }

  function createBackupPayload() {
    return JSON.stringify({
      type: 'live_combo_backup',
      version: 1,
      exportedAt: new Date().toISOString(),
      products: Array.isArray(state.products) ? state.products : [],
      productsUpdatedAt: state.productsUpdatedAt || null,
      workspace: state.workspace || {}
    }, null, 2);
  }

  function normalizeBackup(raw) {
    if (!raw || typeof raw !== 'object') {
      throw new Error('文件内容不是有效 JSON 对象。');
    }

    var products = Array.isArray(raw.products) ? raw.products : [];
    var productsUpdatedAtRaw = raw.productsUpdatedAt;
    var productsUpdatedAtNum = productsUpdatedAtRaw == null ? NaN : Number(productsUpdatedAtRaw);
    var workspace = raw.workspace && typeof raw.workspace === 'object' ? raw.workspace : {};
    var bundles = Array.isArray(workspace.bundles) ? workspace.bundles : [];
    var currentBundleId = typeof workspace.currentBundleId === 'string' ? workspace.currentBundleId : '';

    return {
      products: products,
      productsUpdatedAt: Number.isFinite(productsUpdatedAtNum) ? productsUpdatedAtNum : null,
      workspace: {
        bundles: bundles,
        currentBundleId: currentBundleId
      }
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

  function downloadJson(filename, content) {
    var blob = new Blob([content], { type: 'application/json;charset=utf-8' });
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
