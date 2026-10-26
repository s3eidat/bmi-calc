/* BMI Calc — WHO adult BMI categories, Mifflin-St Jeor BMR, waist-to-height ratio. All local. */
(function () {
  "use strict";
  var $ = S3.$, $$ = S3.$$;
  var KEY = "bmi.v1", LB = 0.45359237, IN = 2.54;
  var ACT = [["1.2", "Sedentary"], ["1.375", "Light"], ["1.55", "Moderate"], ["1.725", "Active"], ["1.9", "Very active"]];
  var CATS = [
    { max: 18.5, name: "Underweight", c: 0 }, { max: 25, name: "Healthy weight", c: 1 }, { max: 30, name: "Overweight", c: 2 },
    { max: 35, name: "Obesity class I", c: 3 }, { max: 40, name: "Obesity class II", c: 3 }, { max: Infinity, name: "Obesity class III", c: 3 }];
  var st = { units: "metric", sex: "m", bmi: null, out: null };

  function num(v) {
    v = String(v == null ? "" : v)
      .replace(/[٠-٩]/g, function (d) { return d.charCodeAt(0) - 0x660; })
      .replace(/[۰-۹]/g, function (d) { return d.charCodeAt(0) - 0x6F0; })
      .replace(/٫/g, ".").replace(/[,\s_٬]/g, "");
    return /^[-+]?(\d+\.?\d*|\.\d+)$/.test(v) ? parseFloat(v) : NaN;
  }

  // ---------- maths (metric inside) ----------
  function bmi(kg, cm) { var m = cm / 100; return kg / (m * m); }
  function category(b) { for (var i = 0; i < CATS.length; i++) if (b < CATS[i].max) return CATS[i]; return CATS[CATS.length - 1]; }
  function healthyRange(cm) { var m = cm / 100; return [18.5 * m * m, 24.9 * m * m]; }
  function bmr(kg, cm, age, sex) { return 10 * kg + 6.25 * cm - 5 * age + (sex === "f" ? -161 : 5); }
  function whtr(waist, cm) { return waist / cm; }
  function whtrLabel(r) { return r < 0.4 ? "Low — check with a doctor" : r < 0.5 ? "Healthy" : r < 0.6 ? "Increased risk" : "High risk"; }
  var round1 = function (v) { return Math.round(v * 10) / 10; };

  // ---------- gauge ----------
  function cssVar(n) { return getComputedStyle(document.documentElement).getPropertyValue(n).trim(); }
  function drawGauge() {
    var cv = $("#gauge"), W = cv.clientWidth, H = cv.clientHeight, dpr = window.devicePixelRatio || 1;
    if (!W || !H) return;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    var g = cv.getContext("2d");
    g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
    var lo = 15, hi = 40, cx = W / 2, R = Math.min(W / 2 - 24, H - 22), cy = R + 14, th = 16;
    function ang(v) { return Math.PI + (Math.max(lo, Math.min(hi, v)) - lo) / (hi - lo) * Math.PI; }
    var segs = [[lo, 18.5, "--accent"], [18.5, 25, "--ok"], [25, 30, "--warn"], [30, hi, "--danger"]];
    g.lineWidth = th; g.lineCap = "butt";
    segs.forEach(function (s) {
      var b = st.bmi, on = b == null || ((s[0] === lo || b >= s[0]) && (s[1] === hi || b < s[1]));
      g.strokeStyle = cssVar(s[2]); g.globalAlpha = on ? 1 : .3;
      g.beginPath(); g.arc(cx, cy, R, ang(s[0]) + .012, ang(s[1]) - .012); g.stroke();
    });
    g.globalAlpha = 1;
    g.font = "11px " + getComputedStyle(document.body).fontFamily; g.fillStyle = cssVar("--text-3"); g.textAlign = "center"; g.textBaseline = "middle";
    [18.5, 25, 30].forEach(function (v) {
      var a = ang(v), r = R - th / 2 - 12;
      g.fillText(String(v), cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    });
    if (st.bmi != null) {
      var a = ang(st.bmi), r1 = R - th - 4, r2 = R + th / 2 + 4;
      g.strokeStyle = cssVar("--text"); g.lineWidth = 3; g.lineCap = "round";
      g.beginPath(); g.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); g.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2); g.stroke();
    }
  }

  // ---------- UI ----------
  function seg(el, value, onPick) {
    $$("button", el).forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.dataset.v === value));
      b.addEventListener("click", function () {
        $$("button", el).forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
        onPick(b.dataset.v);
      });
    });
  }
  function stat(label, value, sub) { return '<div class="stat"><b>' + S3.esc(value) + "</b><span>" + S3.esc(label) + "</span>" + (sub ? "<em>" + S3.esc(sub) + "</em>" : "") + "</div>"; }
  function f1(v) { return round1(v).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 }); }
  function f0(v) { return Math.round(v).toLocaleString(); }

  function heightCm() {
    if (st.units === "metric") return num($("#hcm").value);
    var ft = $("#hft").value.trim() ? num($("#hft").value) : 0, inch = $("#hin").value.trim() ? num($("#hin").value) : 0;
    return (ft * 12 + inch) * IN;
  }
  function weightKg() { var w = num($("#w").value); return st.units === "metric" ? w : w * LB; }
  function waistCm() { var w = num($("#waist").value); return st.units === "metric" ? w : w * IN; }
  function showW(kg) { return st.units === "metric" ? f1(kg) + " kg" : f1(kg / LB) + " lb"; }

  function save() {
    S3.store(KEY, { units: st.units, sex: st.sex, age: $("#age").value, hcm: $("#hcm").value, hft: $("#hft").value, hin: $("#hin").value,
      w: $("#w").value, waist: $("#waist").value, act: $("#act").value });
  }

  function render() {
    save();
    $(".metric").hidden = st.units !== "metric"; $(".imperial").hidden = st.units === "metric";
    $(".u-w").textContent = st.units === "metric" ? "kg" : "lb"; $(".u-l").textContent = st.units === "metric" ? "cm" : "in";
    var cm = heightCm(), kg = weightKg(), age = num($("#age").value), waist = waistCm(), err = "";
    if (!(cm >= 50 && cm <= 272)) err = $("#hcm").value || $("#hft").value ? "Enter a height between 50 and 272 cm (1′8″–8′11″)." : "";
    else if (!(kg >= 10 && kg <= 650)) err = $("#w").value ? "Enter a weight between 10 and 650 kg (22–1,433 lb)." : "";
    $("#err").textContent = err;
    if (err || !(cm > 0) || !(kg > 0)) {
      st.bmi = null; st.out = null;
      $("#bmi").textContent = "—"; $("#cat").className = "chip"; $("#cat").textContent = "Enter your height and weight";
      $("#stats").innerHTML = ""; $("#cal").innerHTML = ""; drawGauge(); return;
    }
    var b = bmi(kg, cm), c = category(b), range = healthyRange(cm);
    st.bmi = b;
    $("#bmi").textContent = f1(b);
    $("#cat").className = "chip c" + c.c; $("#cat").textContent = c.name;
    var diff = kg < range[0] ? "gain " + showW(range[0] - kg) + " to reach it" : kg > range[1] ? "lose " + showW(kg - range[1]) + " to reach it" : "you are in range";
    var html = stat("healthy weight for your height", showW(range[0]).replace(/ (kg|lb)$/, "") + " – " + showW(range[1]), diff) +
      stat("BMI Prime", (b / 25).toFixed(2), "1.00 is the top of the healthy range");
    var adult = age >= 18 && age <= 120;
    if (waist > 0) { var r = whtr(waist, cm); html += stat("waist-to-height ratio", r.toFixed(2), whtrLabel(r) + " · keep it under 0.5"); }
    if (adult) {
      var base = bmr(kg, cm, age, st.sex);
      html += stat("BMR (Mifflin-St Jeor)", f0(base) + " kcal", "calories at complete rest");
    }
    $("#stats").innerHTML = html;
    if (adult) {
      var sel = $("#act").value;
      $("#cal").innerHTML = '<thead><tr><th>Activity</th><th class="num">Maintain</th><th class="num">' + (st.units === "metric" ? "Lose ~0.5 kg/wk" : "Lose ~1 lb/wk") + '</th></tr></thead><tbody>' +
        ACT.map(function (a) {
          var t = base * +a[0];
          return '<tr class="' + (a[0] === sel ? "on" : "") + '"><td>' + a[1] + '</td><td class="num">' + f0(t) + ' kcal</td><td class="num">' + f0(Math.max(t - 500, st.sex === "f" ? 1200 : 1500)) + " kcal</td></tr>";
        }).join("") + "</tbody>";
    } else {
      $("#cal").innerHTML = '<tbody><tr><td class="muted">' + (age > 0 && age < 18 ? "BMI categories and calorie formulas here are for adults (18+). For children and teens, BMI is read on age-and-sex percentile charts." : "Add your age to see BMR and daily calories.") + "</td></tr></tbody>";
    }
    st.out = "BMI " + f1(b) + " (" + c.name + ")\nHealthy weight for " + Math.round(cm) + " cm: " + showW(range[0]) + " – " + showW(range[1]) +
      (waist > 0 ? "\nWaist-to-height: " + whtr(waist, cm).toFixed(2) : "") + (adult ? "\nBMR: " + f0(base) + " kcal/day, maintenance " + f0(base * +$("#act").value) + " kcal/day" : "");
    drawGauge();
  }

  function convertUnits(to) {
    if (to === st.units) return;
    var cm = heightCm(), kg = weightKg(), w = waistCm();
    st.units = to;
    if (to === "imperial") {
      if (cm > 0) { var inch = cm / IN, ft = Math.floor(inch / 12); $("#hft").value = ft; $("#hin").value = round1(inch - ft * 12); }
      if (kg > 0) $("#w").value = round1(kg / LB);
      if (w > 0) $("#waist").value = round1(w / IN);
    } else {
      if (cm > 0) $("#hcm").value = round1(cm);
      if (kg > 0) $("#w").value = round1(kg);
      if (w > 0) $("#waist").value = round1(w);
    }
    render();
  }

  // ---------- wiring ----------
  var s = S3.store(KEY) || {};
  st.units = s.units === "imperial" ? "imperial" : "metric"; st.sex = s.sex === "f" ? "f" : "m";
  $("#age").value = s.age || ""; $("#hcm").value = s.hcm || ""; $("#hft").value = s.hft || ""; $("#hin").value = s.hin || "";
  $("#w").value = s.w || ""; $("#waist").value = s.waist || ""; $("#act").value = ACT.some(function (a) { return a[0] === s.act; }) ? s.act : "1.375";
  seg($("#units"), st.units, convertUnits);
  seg($("#sex"), st.sex, function (v) { st.sex = v; render(); });
  $$("#age, #hcm, #hft, #hin, #w, #waist").forEach(function (el) { el.addEventListener("input", render); });
  $("#act").addEventListener("change", render);
  $("#copy").addEventListener("click", function () {
    if (!st.out) return S3.toast("Enter your height and weight first", "error");
    S3.copy(st.out); S3.done();
  });
  if (window.ResizeObserver) new ResizeObserver(S3.debounce(drawGauge, 60)).observe($("#gauge"));
  new MutationObserver(drawGauge).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  render();

  window.S3_DEMO = function () {
    $("#units button[data-v=metric]").click();
    $("#sex button[data-v=m]").click();
    $("#age").value = "32"; $("#hcm").value = "178"; $("#w").value = "84"; $("#waist").value = "88"; $("#act").value = "1.55";
    render();
  };

  window.S3_SELFTEST = function () {
    var r = healthyRange(175);
    return f1(bmi(70, 175)) === "22.9" && category(bmi(70, 175)).name === "Healthy weight" &&
      Math.abs(bmi(150 * LB, 65 * IN) - 703 * 150 / (65 * 65)) < 0.02 &&                    // imperial formula agrees
      category(18.49).c === 0 && category(18.5).c === 1 && category(25).c === 2 && category(30).name === "Obesity class I" && category(40).name === "Obesity class III" &&
      bmr(70, 175, 30, "m") === 1648.75 && bmr(70, 175, 30, "f") === 1482.75 &&
      round1(r[0]) === 56.7 && round1(r[1]) === 76.3 &&
      whtr(80, 175).toFixed(2) === "0.46" && whtrLabel(0.55) === "Increased risk";
  };
})();
