(function () {
  "use strict";

  /* ---------- Tap to zoom ---------- */
  var lb = document.getElementById("lb");
  var lbImg = document.getElementById("lb-img");
  var lbTitle = document.getElementById("lb-title");
  var lbMeta = document.getElementById("lb-meta");
  var lbCount = document.getElementById("lb-count");
  var lbPrev = document.getElementById("lb-prev");
  var lbNext = document.getElementById("lb-next");
  var lbClose = document.getElementById("lb-close");
  var lbStage = document.getElementById("lb-stage");
  var group = [], idx = 0, opener = null, swiped = false;

  function details(btn) {
    var img = btn.querySelector("img");
    var fig = btn.closest("figure");
    var t = btn.getAttribute("data-title"), m = btn.getAttribute("data-meta");
    if (!t && fig && fig.querySelector(".t")) t = fig.querySelector(".t").textContent;
    if (!m && fig && fig.querySelector(".cap .meta")) m = fig.querySelector(".cap .meta").textContent;
    return { src: img.getAttribute("src"), alt: img.alt, t: t || "", m: m || "" };
  }
  function show(i) {
    idx = (i + group.length) % group.length;
    var d = details(group[idx]);
    lbImg.src = d.src;
    lbImg.alt = d.alt;
    lbTitle.textContent = d.t;
    lbMeta.textContent = d.m;
    lbCount.textContent = group.length > 1 ? (idx + 1) + " / " + group.length : "";
    lbPrev.hidden = lbNext.hidden = group.length < 2;
  }
  function openLb(btn) {
    opener = btn;
    group = Array.prototype.slice.call(document.querySelectorAll('.zoom[data-group="' + btn.getAttribute("data-group") + '"]'));
    show(Math.max(0, group.indexOf(btn)));
    document.documentElement.classList.add("lb-open");
    if (typeof lb.showModal === "function") lb.showModal(); else lb.setAttribute("open", "");
    lbClose.focus();
  }
  function closeLb() {
    if (typeof lb.close === "function") lb.close(); else { lb.removeAttribute("open"); onClosed(); }
  }
  function onClosed() {
    document.documentElement.classList.remove("lb-open");
    lbImg.src = "data:,";
    if (opener && document.contains(opener)) opener.focus();
  }
  document.querySelectorAll(".zoom").forEach(function (b) {
    b.addEventListener("click", function () { openLb(b); });
  });
  lb.addEventListener("close", onClosed);
  lbClose.addEventListener("click", closeLb);
  lbPrev.addEventListener("click", function () { show(idx - 1); });
  lbNext.addEventListener("click", function () { show(idx + 1); });
  lb.addEventListener("keydown", function (e) {
    if (group.length < 2) return;
    if (e.key === "ArrowLeft") { e.preventDefault(); show(idx - 1); }
    if (e.key === "ArrowRight") { e.preventDefault(); show(idx + 1); }
  });
  lb.addEventListener("click", function (e) {
    if (swiped) { swiped = false; return; }
    if (e.target === lb || e.target === lbStage) closeLb();
  });
  var sx = 0, sy = 0, tracking = false;
  lb.addEventListener("pointerdown", function (e) {
    if (e.pointerType === "mouse") return;
    sx = e.clientX; sy = e.clientY; tracking = true; swiped = false;
  });
  lb.addEventListener("pointerup", function (e) {
    if (!tracking) return;
    tracking = false;
    var dx = e.clientX - sx, dy = e.clientY - sy;
    if (group.length > 1 && Math.abs(dx) > 50 && Math.abs(dy) < 80) {
      swiped = true;
      show(idx + (dx < 0 ? 1 : -1));
    }
  });
  lb.addEventListener("pointercancel", function () { tracking = false; });

  /* Drawings: no right-click or long-press save, no dragging the image out */
  function guard(e) { if (e.target.closest && e.target.closest(".zoom, .lb-stage")) e.preventDefault(); }
  document.addEventListener("contextmenu", guard);
  document.addEventListener("dragstart", guard);
  document.querySelectorAll(".zoom img, .lb-stage img").forEach(function (i) { i.setAttribute("draggable", "false"); });

  /* ---------- Rudra ---------- */
  var reduceAll = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var rudhras = {};
  // Dots for the R: the letter is drawn by hand (no font), then dots are spread evenly over it
  function rTargets(n, W) {
    var M = 160, c = document.createElement("canvas"); c.width = M; c.height = M;
    var g = c.getContext("2d");
    function U(v) { return v * M; }
    g.fillStyle = "#000"; g.strokeStyle = "#000"; g.lineJoin = "round"; g.lineCap = "butt";
    g.fillRect(U(0.24), U(0.14), U(0.13), U(0.72));                  // stem
    g.lineWidth = U(0.12);                                           // bowl
    g.beginPath(); g.moveTo(U(0.30), U(0.20)); g.lineTo(U(0.50), U(0.20));
    g.arc(U(0.50), U(0.335), U(0.135), -Math.PI / 2, Math.PI / 2); g.lineTo(U(0.30), U(0.47)); g.stroke();
    g.beginPath(); g.moveTo(U(0.46), U(0.47)); g.quadraticCurveTo(U(0.60), U(0.62), U(0.79), U(0.84)); g.stroke(); // leg
    g.fillRect(U(0.15), U(0.82), U(0.32), U(0.05));                  // serifs
    g.fillRect(U(0.15), U(0.14), U(0.17), U(0.05));
    g.fillRect(U(0.70), U(0.82), U(0.19), U(0.05));
    var data = g.getImageData(0, 0, M, M).data, cand = [];
    for (var y = 1; y < M; y += 2) for (var x = 1; x < M; x += 2) if (data[(y * M + x) * 4 + 3] > 128) cand.push([x, y]);
    // farthest-point picking keeps the dots evenly spaced and the edges crisp
    var pick = [], best = new Array(cand.length).fill(1e9), cur = 0;
    for (var k = 0; k < cand.length; k++) if (cand[k][0] + cand[k][1] < cand[cur][0] + cand[cur][1]) cur = k;
    for (var i = 0; i < n && cand.length; i++) {
      pick.push(cand[cur]);
      var far = 0, fd = -1;
      for (var j = 0; j < cand.length; j++) {
        var d = (cand[j][0] - cand[cur][0]) * (cand[j][0] - cand[cur][0]) + (cand[j][1] - cand[cur][1]) * (cand[j][1] - cand[cur][1]);
        if (d < best[j]) best[j] = d;
        if (best[j] > fd) { fd = best[j]; far = j; }
      }
      cur = far;
    }
    var size = W * 0.64, ox = (W - size) / 2, oy = (W - size) / 2;
    var pts = pick.map(function (q) { return { x: ox + q[0] / M * size, y: oy + q[1] / M * size }; });
    for (var a = pts.length - 1; a > 0; a--) { var b = Math.floor(Math.random() * (a + 1)); var t = pts[a]; pts[a] = pts[b]; pts[b] = t; }
    var sum = 0;
    pts.forEach(function (P, ii) { var m = 1e9; pts.forEach(function (Q, jj) { if (ii !== jj) m = Math.min(m, Math.hypot(P.x - Q.x, P.y - Q.y)); }); sum += m; });
    return { pts: pts, gap: sum / Math.max(1, pts.length) };
  }
  function makeRudra(el, n) {
    var canvas = el.querySelector("canvas");
    if (!canvas) return { think: function (on) { el.classList.toggle("thinking", on); } };
    var shown = el.getBoundingClientRect().width, cssSize = parseFloat(getComputedStyle(el).getPropertyValue("--rs")) || shown || 48;
    var dpr = Math.min((window.devicePixelRatio || 1) * Math.max(1, shown / cssSize || 1), 3); // stay sharp when the page is scaled up
    var size = parseFloat(getComputedStyle(el).getPropertyValue("--rs")) || el.offsetWidth || 48;
    canvas.width = Math.round(size * dpr); canvas.height = Math.round(size * dpr);
    var ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);
    var W = size, CX = W / 2, R = W * 0.4, link = W * 0.24;
    var T = rTargets(n, W), formedLink = T.gap * 1.9;
    var pts = [];
    for (var i = 0; i < n; i++) {
      var a = Math.random() * Math.PI * 2, rr = Math.sqrt(Math.random()) * R, tg = T.pts[i % T.pts.length];
      pts.push({ x: CX + Math.cos(a) * rr, y: CX + Math.sin(a) * rr, vx: (Math.random() - .5) * W / 600, vy: (Math.random() - .5) * W / 600, tx: tg.x, ty: tg.y });
    }
    var form = 0, want = false, visible = true, running = false;
    function draw() {
      running = false;
      if (!visible || document.hidden) return;
      form += ((want ? 1 : 0) - form) * 0.07;
      var ease = form * form * (3 - 2 * form);
      ctx.clearRect(0, 0, W, W);
      for (var i = 0; i < pts.length; i++) {
        var p = pts[i];
        p.x += p.vx; p.y += p.vy;
        var dx = p.x - CX, dy = p.y - CX, dd = Math.hypot(dx, dy);
        if (dd > R) { p.vx -= dx / dd * W / 2400; p.vy -= dy / dd * W / 2400; }
        p.vx += (Math.random() - .5) * W / 12000; p.vy += (Math.random() - .5) * W / 12000;
        p.vx *= .996; p.vy *= .996;
        p.dx = p.x + (p.tx - p.x) * ease; p.dy = p.y + (p.ty - p.y) * ease;
      }
      var alpha = .28 + ease * .6, lk = link + (formedLink - link) * ease;
      ctx.lineWidth = Math.max(.5, W / 140);
      for (var a = 0; a < pts.length; a++) for (var b = a + 1; b < pts.length; b++) {
        var A = pts[a], B = pts[b], dist = Math.hypot(A.dx - B.dx, A.dy - B.dy);
        if (dist < lk) { ctx.strokeStyle = "rgba(128,20,44," + (alpha * (1 - dist / lk)).toFixed(3) + ")"; ctx.beginPath(); ctx.moveTo(A.dx, A.dy); ctx.lineTo(B.dx, B.dy); ctx.stroke(); }
      }
      ctx.fillStyle = "rgba(128,20,44," + Math.min(1, alpha + .15).toFixed(3) + ")";
      var r = Math.max(.8, W / 70);
      for (var q = 0; q < pts.length; q++) { ctx.beginPath(); ctx.arc(pts[q].dx, pts[q].dy, r, 0, Math.PI * 2); ctx.fill(); }
      if (!reduceAll || want || form > .01) { running = true; requestAnimationFrame(draw); }
    }
    function start() { if (!running) { running = true; requestAnimationFrame(draw); } }
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible) start(); }).observe(el);
    }
    document.addEventListener("visibilitychange", function () { if (!document.hidden) start(); });
    start();
    return { think: function (on) { want = on; el.classList.toggle("thinking", on); start(); } };
  }
  document.querySelectorAll("[data-rudhra]").forEach(function (el) {
    rudhras[el.getAttribute("data-rudhra")] = makeRudra(el, el.getAttribute("data-rudhra") === "card" ? 78 : 46);
  });
  var thinkTimers = {};
  function rudhraThink(name, on, ms) {
    var r = rudhras[name]; if (!r) return;
    clearTimeout(thinkTimers[name]);
    r.think(on);
    if (on && ms) thinkTimers[name] = setTimeout(function () { r.think(false); }, ms);
  }
  // the card shows its trick now and then, and on hover
  var cardEl = document.querySelector('[data-rudhra="card"]');
  if (cardEl) {
    cardEl.parentElement.addEventListener("mouseenter", function () { rudhraThink("card", true, 2600); });
    if (!reduceAll) setInterval(function () { rudhraThink("card", true, 2600); }, 8000);
  }

  /* ---------- Ask Rudra ---------- */
  var IG = "@vckymyst";
  var IG_URL = "https://www.instagram.com/vckymyst/";
  var STARTERS = ["Who is Venkat?", "How does he draw?", "What's he building with AI?", "How can I reach him?"];

  // Each topic: phrases with weights, the answer, and follow-up questions.
  var KB = [
    { id: "greeting", p: [["hi",1],["hii",1],["hello",1],["hey",1],["namaste",1],["good morning",1],["good evening",1],["hi rudhra",6],["hello rudhra",6],["hey rudhra",6],["hii rudhra",6],["hi rudra",6],["hello rudra",6],["hey rudra",6],["hii rudra",6]],
      a: "Hi there, nice to meet you! I'm Rudra. Ask me anything about Venkat's art or his AI projects.",
      next: STARTERS },
    { id: "bot", p: [["are you ai",4],["are you a bot",4],["are you real",4],["who are you",4],["chatbot",3],["bot",2],["how do you work",3],["how does this chat work",5],["this chat",3],["human",2],["rudhra",4],["who is rudhra",6],["rudra",4],["who is rudra",6],["your name",5],["what are you",4]],
      a: "I'm Rudra, Venkat's assistant. I answer from notes he wrote, so I only know what's on this page. A real AI version, running on his own AWS, is next.",
      next: ["Who is Venkat?", "What's he building with AI?"] },
    { id: "self", p: [["about you",7],["tell me about you",8],["about yourself",7],["yourself",4],["introduce yourself",7],["who r u",6],["what do you do",6]],
      a: "I'm Rudra, Venkat's assistant on this page. I answer questions about him using notes he wrote. Venkat himself is a graphite artist and AI engineer in Austin, Texas. Ask me about his drawings or his AI projects!",
      next: ["How does he draw?", "What's he building with AI?", "Who made you?"] },
    { id: "maker", p: [["who made you",8],["who built you",8],["who created you",8],["who designed you",7],["made you",5],["built you",5],["created you",5],["who made this",7],["who built this",7],["this website",4],["this site",4],["website",3]],
      a: "Venkat built this site, and me, himself. For now I answer from notes he wrote. Next, he's building a real AI version of me on his own AWS.",
      next: ["What's he building with AI?", "How can I reach him?"] },
    { id: "notvenkat", p: [["are you venkat",9],["are you vicky",9],["is this venkat",8],["is this vicky",8],["talking to venkat",7],["talking to vicky",7],["am i talking to",6],["is venkat here",7],["venkat himself",6]],
      a: "I'm Rudra, Venkat's assistant, not Venkat himself. To reach him directly, DM him on Instagram: " + IG + ".",
      next: ["Who is Venkat?", "What can you do?"] },
    { id: "capabilities", p: [["what can you do",8],["what can i ask",8],["what should i ask",7],["what do you know",6],["help",4],["help me",5],["options",3]],
      a: "I can tell you about Venkat's drawings, how he draws, his AI projects, and how to reach him. Pick one to start:",
      next: STARTERS },
    { id: "howareyou", p: [["how are you",4],["how r u",4],["how are you doing",5],["how's it going",5],["hows it going",5],["what's up",4],["whats up",4]],
      a: "Doing great, thanks for asking! What would you like to know about Venkat?",
      next: STARTERS },
    { id: "about", p: [["who is",3],["who's",3],["whos",3],["tell me about",3],["about venkat",4],["about vicky",4],["about him",3],["introduce",3],["venkat",1],["vicky",1],["him",0.5]],
      a: "Venkat is a graphite pencil artist and an AI engineer in Austin, Texas. Friends call him Vicky. His line: “I draw what I can't explain. I build what I want to understand.”",
      next: ["How does he draw?", "What's he building with AI?", "How can I reach him?"] },
    { id: "name", p: [["name",3],["his name",4],["nickname",4],["called",2],["call him",3],["same person",4],["same",1.5],["vicky",1.5],["venkat",1]],
      a: "His name is Venkat. Vicky is what his friends call him.",
      next: ["Who is Venkat?", "How can I reach him?"] },
    { id: "location", p: [["where",1],["live",1.5],["lives",1.5],["based",2],["location",2],["city",1.5],["austin",2],["texas",2],["from",0.5]],
      a: "Venkat is based in Austin, Texas.",
      next: ["Who is Venkat?", "How can I reach him?"] },
    { id: "medium", p: [["pencil",2.5],["pencils",2.5],["graphite",2.5],["charcoal",4],["medium",2],["paper",1.5],["materials",2.5],["supplies",2.5],["draw with",3],["what does he use",3],["what do you use",3]],
      a: "Graphite pencils on paper, all by hand, from light grades to very dark ones. For his next piece, a jhumka study, he's trying charcoal alongside graphite.",
      next: ["How does he draw?", "What's he drawing next?"] },
    { id: "process", p: [["process",3],["how do you draw",4],["how does he draw",4],["how he draws",4],["floor",3],["reference",3],["technique",3],["method",2],["steps",1.5],["tissue",4],["smudge",4],["smudging",4],["eyes first",4],["phone",2]],
      a: "He draws on the floor, never at a table. The reference stays on his phone so he can zoom into every detail. He starts with the eyes and covers the rest of the sheet with tissue, so his hand doesn't smudge it.",
      next: ["How long does a drawing take?", "What's he drawing next?"] },
    { id: "grid", p: [["grid",4],["proportion",3],["proportions",3],["outline",2],["outlines",2]],
      a: "He draws a light pencil grid first to place everything, then shades over it. You can spot the grid in the Laxmi step photos.",
      next: ["How does he draw?", "Tell me about the Laxmi drawing"] },
    { id: "time", p: [["how long",3],["how much time",3.5],["time",1.5],["hours",2],["days",1.5],["one day",2],["fast",1]],
      a: "It depends on the detail. His Virat Kohli portrait took a single day. Big pieces like Laxmi, with the crown and all the jewelry, take many sessions.",
      next: ["How does he draw?", "Tell me about the Laxmi drawing"] },
    { id: "since", p: [["how long have",4.5],["how long has",4.5],["been drawing",4],["since when",4],["when did he start",4.5],["started drawing",4],["start drawing",4],["learn to draw",4],["learned",2],["learnt",2],["self taught",4],["taught",2],["classes",3],["childhood",3],["years",1]],
      a: "Since childhood. Drawing came naturally to him. The earliest pieces on this page are from 2019.",
      next: ["What was his first drawing here?", "How does he draw?"] },
    { id: "early", p: [["first drawing",5],["earliest",4],["early",3],["old drawings",4],["older",3],["2019",3],["journey",3],["beginning",2.5],["first",1.5]],
      a: "The earliest drawings on this page are from 2019, including the side profile where his journey started. He's been drawing since childhood, though.",
      next: ["What's his newest drawing?", "How does he draw?"] },
    { id: "newest", p: [["newest",5],["latest",5],["recent",4],["most recent",5],["new",1.5],["last drawing",4]],
      a: "His newest pieces are Laxmi and a 2024 portrait. Next is a jhumka study, where he's trying charcoal alongside graphite.",
      next: ["Tell me about the Laxmi drawing", "What's he drawing next?"] },
    { id: "laxmi", p: [["lakshmi",4],["laxmi",4],["goddess",3],["lotus",1.5],["crown",1.5]],
      a: "Laxmi is one of his most detailed pieces. The page shows it in seven steps: the eyes first, then the face, the crown, the jewelry and garland, the arms with the lotus and pot, the saree, and the finished drawing.",
      next: ["How long does a drawing take?", "What's he drawing next?"] },
    { id: "virat", p: [["virat",4],["kohli",4],["cricketer",3]],
      a: "Venkat drew Virat Kohli in December 2019, in a single day.",
      next: ["How long does a drawing take?", "How does he draw?"] },
    { id: "celebs", p: [["celebrity",4],["celebrities",4],["famous",4],["angelina",4],["jolie",4],["actor",3],["actress",3],["star",2]],
      a: "Two of the drawings are well-known faces: Angelina Jolie, from 2020, and Virat Kohli, from December 2019, drawn in a single day.",
      next: ["Who are the other portraits?", "How does he draw?"] },
    { id: "portraits", p: [["who is she",4],["who is he",4],["who is this",4],["who are they",4],["friends",3],["portrait",2],["portraits",2.5],["people",2],["names",3],["other portraits",4],["girl",2],["woman",2],["lady",2],["man",1.5],["guy",1.5]],
      a: "Many of the portraits are of friends and family. He shares them without names.",
      next: ["How does he draw?", "Does he take commissions?"] },
    { id: "devotional", p: [["god",3],["gods",3],["devotional",4],["krishna",4],["buddha",4],["spiritual",3],["divine",3],["religious",3]],
      a: "His devotional pieces on this page are Laxmi, Krishna with flute, Little Krishna and Little Buddha.",
      next: ["Tell me about the Laxmi drawing", "How does he draw?"] },
    { id: "next", p: [["next",2.5],["working on",3],["drawing next",4],["currently",2],["upcoming",2.5],["new drawing",3],["jhumka",5]],
      a: "Next on the floor is a jhumka study. He's trying charcoal alongside graphite this time. Follow " + IG + " to see it come together.",
      next: ["How does he draw?", "How can I reach him?"] },
    { id: "ai", p: [["ai",3],["artificial intelligence",4],["project",2],["projects",2],["building",2],["build",1.5],["machine learning",3],["ml",2],["coding",2],["code",1.5]],
      a: "His main personal AI project is a medical image AI, built in phases. Phase 1, in progress, names blood cell types from a microscope image and explains them simply. Phase 2 is research on spotting unusual cells, like early signs of leukemia. Phase 3 explores reading MRI and CT scans. It's a research project and never gives a diagnosis.",
      next: ["How does Phase 1 work?", "What data does it use?"] },
    { id: "bloodcell", p: [["blood",4],["cell",3],["cells",3],["blood cell ai",5],["medical",2.5],["dataset",3],["model",2],["health",2],["phase 1",5],["how does phase 1 work",6],["data",2.5],["what data",4],["data come from",5],["trained",3],["training",3]],
      a: "Phase 1 looks at a microscope image of one blood cell and names which of 8 blood cell types it is, then explains it in plain words. It runs in your browser, so the image stays on your device. It's trained on open-source medical image data, and it never gives a diagnosis.",
      next: ["What comes next?", "What are his skills?"] },
    { id: "medical", p: [["cancer",6],["leukemia",6],["leukaemia",6],["disease",5],["diseases",5],["detect",3],["diagnose",5],["diagnosis",4],["phase 2",5],["what comes next",4],["unusual",3],["sick",4],["anemia",5],["infection",4]],
      a: "Phase 2 is research on spotting unusual blood cells, like early signs of leukemia, a blood cancer. It's a research project, not a medical tool, so it never gives a diagnosis. For any health worry, please see a doctor.",
      next: ["What's he building with AI?", "What data does it use?"] },
    { id: "idea", p: [["idea",3],["ideas",3],["other ai",3],["mri",4],["ct",3],["scan",3],["scans",3],["future",2],["phase 3",5],["scan reader",5]],
      a: "Phase 3 is a scan reader: exploring how AI could help read MRI and CT scans faster, as research.",
      next: ["What's he building with AI?", "What are his skills?"] },
    { id: "skills", p: [["skills",3],["skill",3],["tech",2],["stack",2.5],["python",3],["java",3],["aws",3],["languages",2],["technologies",2.5],["tools",2],["speak",-3],["speaks",-3]],
      a: "Python, Java and AWS (Lambda, API Gateway and Bedrock), plus building AI assistants.",
      next: ["What's he building with AI?", "Where does he work?"] },
    { id: "work", p: [["job",3],["work",1.5],["works",1],["company",3],["employer",3],["client",3],["clients",3],["day job",4],["office",2],["career",2],["where does he work",5]],
      a: "Venkat works as a full stack AI engineer. This page only shares his personal projects, so client work stays private.",
      next: ["What's he building with AI?", "What are his skills?"] },
    { id: "commission", p: [["commission",4],["commissions",4],["buy",3],["price",3],["cost",3],["how much",3],["sell",3],["selling",3],["order",2],["custom",2],["draw me",4],["portrait of me",4],["hire",3],["charge",3],["paid",2]],
      a: "Venkat isn't taking commissions right now. If a piece speaks to you, he'd love to hear about it in a DM on Instagram: " + IG + ".",
      next: ["How can I reach him?", "What's he drawing next?"] },
    { id: "contact", p: [["contact",4],["reach",3],["dm",3],["instagram",3],["insta",3],["email",3],["email address",4],["follow",2],["message",2],["connect",2],["see more",3],["more art",3],["socials",3]],
      a: "The best way to reach Venkat is a DM on Instagram: " + IG + ".",
      next: ["Who is Venkat?", "What's he drawing next?"] },
    { id: "private", p: [["girlfriend",4],["wife",4],["married",4],["marry",4],["marriage",4],["dating",4],["single",1],["salary",4],["visa",4],["how old",4],["age",3],["relationship",4],["religion",3],["caste",4],["phone number",4],["address",2],["partner",4],["life partner",5]],
      a: "That's something Venkat keeps private. Ask me about his art or his projects instead.",
      next: ["How does he draw?", "What's he building with AI?"] },
    { id: "cooking", p: [["cook",3],["cooking",3],["food",3],["recipe",3],["recipes",3],["chef",3],["kitchen",3]],
      a: "Venkat loves cooking at home, and sometimes he sings while he cooks. A few of those moments are on his Instagram, " + IG + ".",
      next: ["Who is Venkat?", "How can I reach him?"] },
    { id: "music", p: [["sing",3],["sings",3],["singing",3],["song",3],["songs",3],["music",3]],
      a: "He sometimes sings while he cooks. You'll find a few of those reels on " + IG + ".",
      next: ["Who is Venkat?", "How can I reach him?"] },
    { id: "family", p: [["family",7],["parents",7],["mother",7],["father",7],["mom",7],["dad",7],["brother",7],["sister",7],["siblings",7]],
      a: "Venkat keeps family details private. Some of the portraits here are of friends and family, shared without names.",
      next: ["How does he draw?", "What's he building with AI?"] },
    { id: "origin", p: [["born",7],["birthplace",7],["hometown",7],["grew up",7],["originally",4],["native",4],["where is he from",4],["where's he from",4]],
      a: "That isn't in my notes. Venkat is based in Austin, Texas now. For anything more personal, ask him on Instagram: " + IG + ".",
      next: ["Who is Venkat?", "How can I reach him?"] },
    { id: "favorites", p: [["favorite",5],["favourite",5],["favorites",5],["favourites",5],["fav",4]],
      a: "I don't know Venkat's favorites yet. You can ask him on Instagram: " + IG + ".",
      next: STARTERS },
    { id: "collab", p: [["collab",5],["collabs",5],["collaborate",5],["collaboration",5],["work together",5],["freelance",5],["partnership",4]],
      a: "For collabs or work ideas, DM Venkat on Instagram: " + IG + ".",
      next: ["Who is Venkat?", "What's he building with AI?"] },
    { id: "thanks", p: [["thanks",4],["thank",4],["thx",4],["ty",2],["awesome",1],["cool",1],["nice",1],["great",1],["love",1]],
      a: "Anytime! Anything else you'd like to know?",
      next: STARTERS }
  ];
  // someone shares an email or phone number to connect
  function hasContact(q) {
    if (/[^\s@]+@[^\s@]+\.[^\s@]+/.test(q)) return true;
    var m = String(q).match(/\+?\d[\d\s().-]{8,}\d/g) || [];
    return m.some(function (x) { return x.replace(/\D/g, "").length >= 10; });
  }
  var SHARED = {
    id: "contact-shared",
    a: "Thanks! The best way to reach Venkat is a DM on Instagram: " + IG + ".",
    saved: "Thanks! I've passed your message to Venkat. You can also DM him on Instagram: " + IG + ".",
    next: STARTERS
  };
  var FALLBACK = {
    id: "fallback",
    a: "Good question! That isn't in my notes yet, and I only answer from what Venkat wrote. You can ask him on Instagram: " + IG + ", or try one of these.",
    next: STARTERS
  };

  function norm(s) {
    return " " + String(s).toLowerCase()
      .replace(/[‘’]/g, "'")
      .replace(/[^a-z0-9'\s]/g, " ")
      .replace(/\s+/g, " ").trim() + " ";
  }
  function match(question) {
    var t = norm(question), best = FALLBACK, bestScore = 0;
    for (var i = 0; i < KB.length; i++) {
      var s = 0, p = KB[i].p;
      for (var j = 0; j < p.length; j++) {
        if (t.indexOf(" " + p[j][0] + " ") !== -1) s += p[j][1];
      }
      if (s > bestScore) { bestScore = s; best = KB[i]; }
    }
    return best;
  }
  window.__askMatch = match; // used only for testing
  window.__hasContact = hasContact; // used only for testing

  var fab = document.querySelector(".chat-fab");
  var chat = document.getElementById("chat");
  var log = document.getElementById("chat-log");
  var chips = document.getElementById("chat-chips");
  var form = document.getElementById("chat-form");
  var input = document.getElementById("chat-input");
  var closeBtn = document.getElementById("chat-close");
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia && window.matchMedia("(pointer: fine)").matches;
  var started = false, busy = false, lastOpener = null;

  function addText(el, text) {
    var parts = text.split(IG);
    for (var i = 0; i < parts.length; i++) {
      if (parts[i]) el.appendChild(document.createTextNode(parts[i]));
      if (i < parts.length - 1) {
        var a = document.createElement("a");
        a.href = IG_URL; a.target = "_blank"; a.rel = "noopener"; a.textContent = IG;
        el.appendChild(a);
      }
    }
  }
  function bubble(who, text) {
    var div = document.createElement("div");
    div.className = "msg " + (who === "user" ? "msg-user" : "msg-bot");
    if (who === "user") div.textContent = text; else addText(div, text);
    log.appendChild(div);
    log.scrollTop = log.scrollHeight;
    return div;
  }
  function showChips(list) {
    chips.textContent = "";
    list.forEach(function (q) {
      var b = document.createElement("button");
      b.type = "button"; b.className = "chip-btn"; b.textContent = q;
      b.addEventListener("click", function () { ask(q, "button"); });
      chips.appendChild(b);
    });
  }
  function ask(q, via) {
    q = String(q || "").trim();
    if (!q || busy) return;
    busy = true;
    bubble("user", q);
    chips.textContent = "";
    var topic = hasContact(q) ? SHARED : match(q);
    var answer = topic === SHARED && window.__savesQuestions ? SHARED.saved : topic.a;
    // lets a hosted copy of this page count questions (nothing listens on the Claude page)
    try { document.dispatchEvent(new CustomEvent("venkat:ask", { detail: { q: q, topic: topic.id, via: via || "typed" } })); } catch (e) {}
    var typing = document.createElement("div");
    typing.className = "msg msg-bot typing";
    typing.setAttribute("aria-label", "Typing");
    typing.innerHTML = "<i></i><i></i><i></i>";
    log.appendChild(typing);
    log.scrollTop = log.scrollHeight;
    var delay = reduceMotion ? 0 : 450 + Math.min(answer.length * 4, 550);
    rudhraThink("head", true, Math.max(delay, 900));
    setTimeout(function () {
      typing.remove();
      bubble("bot", answer);
      showChips(topic.next);
      busy = false;
    }, delay);
  }
  function openChat(e) {
    lastOpener = (e && e.currentTarget) || fab;
    chat.hidden = false;
    fab.hidden = true;
    fab.setAttribute("aria-expanded", "true");
    if (!started) {
      started = true;
      bubble("bot", "Hi! I'm Rudra, Venkat's assistant ✨ Curious about his drawings, his AI projects, or how to reach him? Just ask.");
      showChips(STARTERS);
    }
    if (finePointer) input.focus(); else closeBtn.focus();
  }
  function closeChat() {
    chat.hidden = true;
    fab.hidden = false;
    fab.setAttribute("aria-expanded", "false");
    (lastOpener && document.contains(lastOpener) && !lastOpener.hidden ? lastOpener : fab).focus();
  }
  document.querySelectorAll("[data-open-chat]").forEach(function (b) { b.addEventListener("click", openChat); });
  closeBtn.addEventListener("click", closeChat);
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !chat.hidden && !lb.open) closeChat(); });
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var q = input.value;
    input.value = "";
    ask(q, "typed");
  });
})();
