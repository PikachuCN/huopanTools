(function (global) {
  'use strict';

  var FEE_RATE = 0.07;

  function toFinite(value, fallback) {
    var n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function normalizeQty(value) {
    var n = Math.floor(toFinite(value, 1));
    return n >= 1 ? n : 1;
  }

  function computeBaseCost(items, productMap) {
    var list = Array.isArray(items) ? items : [];
    var sum = 0;

    for (var i = 0; i < list.length; i += 1) {
      var row = list[i];
      if (!row || !row.product_id) {
        continue;
      }
      var product = productMap.get(String(row.product_id));
      var cost = product ? toFinite(product.cost, 0) : 0;
      var qty = normalizeQty(row.qty);
      sum += cost * qty;
    }

    return sum;
  }

  function invalid(message, CBase) {
    return {
      mode: 'quick',
      valid: false,
      impossible: false,
      message: message || '请输入完整参数。',
      loss: false,
      r_fee: FEE_RATE,
      C_base: CBase,
      P: NaN,
      r_comm: NaN,
      r_profit: NaN,
      maxSafeCommissionRate: NaN,
      Fee: NaN,
      Commission: NaN,
      C_actual: NaN,
      Profit: NaN,
      ProfitRate: NaN
    };
  }

  function calculate(mode, input) {
    var CBase = toFinite(input && input.C_base, 0);
    var P = toFinite(input && input.P, NaN);
    var rComm = toFinite(input && input.r_comm, NaN);

    if (!(P > 0)) {
      return invalid('请输入有效售价（必须大于 0）。', CBase);
    }

    if (!Number.isFinite(rComm)) {
      return invalid('请输入佣金率。', CBase);
    }

    var fee = P * FEE_RATE;
    var commission = P * rComm;
    var cActual = CBase + fee;
    var profit = P - cActual - commission;
    var profitRate = profit / P;
    var safeRComm = 1 - FEE_RATE - CBase / P;

    var message = '';
    if (profit < 0) {
      message = '当前组合为亏损。';
      if (Number.isFinite(safeRComm)) {
        message += ' 不亏损佣金率需 <= ' + (safeRComm * 100).toFixed(2) + '%。';
      }
    }

    return {
      mode: 'quick',
      valid: true,
      impossible: false,
      message: message,
      loss: profit < 0,
      r_fee: FEE_RATE,
      C_base: CBase,
      P: P,
      r_comm: rComm,
      r_profit: profitRate,
      maxSafeCommissionRate: safeRComm,
      Fee: fee,
      Commission: commission,
      C_actual: cActual,
      Profit: profit,
      ProfitRate: profitRate
    };
  }

  function inferStock(items, productMap, metrics) {
    var list = Array.isArray(items) ? items : [];
    if (list.length === 0) {
      return {
        maxSets: 0,
        gmv: 0,
        commissionBudget: 0,
        profitCapacity: 0
      };
    }

    var maxSets = Infinity;

    for (var i = 0; i < list.length; i += 1) {
      var row = list[i];
      if (!row || !row.product_id) {
        continue;
      }
      var product = productMap.get(String(row.product_id));
      var stock = product ? Math.max(0, Math.floor(toFinite(product.stock, 0))) : 0;
      var qty = normalizeQty(row.qty);
      var rowSets = Math.floor(stock / qty);
      maxSets = Math.min(maxSets, rowSets);
    }

    if (!Number.isFinite(maxSets) || maxSets < 0) {
      maxSets = 0;
    }

    var gmv = 0;
    var commissionBudget = 0;
    var profitCapacity = 0;

    if (metrics && metrics.valid) {
      gmv = maxSets * toFinite(metrics.P, 0);
      commissionBudget = maxSets * toFinite(metrics.Commission, 0);
      profitCapacity = maxSets * toFinite(metrics.Profit, 0);
    }

    return {
      maxSets: maxSets,
      gmv: gmv,
      commissionBudget: commissionBudget,
      profitCapacity: profitCapacity
    };
  }

  global.CalcEngine = {
    FEE_RATE: FEE_RATE,
    computeBaseCost: computeBaseCost,
    calculate: calculate,
    inferStock: inferStock
  };
})(window);
