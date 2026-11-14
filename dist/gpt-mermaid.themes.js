/**
 * gpt-mermaid.themes.js —— 配色主题 + 子图圆角（纯 CSS / 配置层，不改绘图逻辑）
 *
 * 为什么单独一个文件：
 *   · 主题本质是一组 CSS 变量，用 mermaid 的 themeVariables 就能表达，不需要动 bundle；
 *   · 子图容器用 CSS 的 `rx`（SVG2 几何属性）加圆角，避免去改泳道/子图两条绘图代码路径。
 *
 * 用法：
 *   <script src="dist/gpt-mermaid.runtime.min.js"></script>
 *   <script src="dist/gpt-mermaid.themes.js"></script>
 *   <script>
 *     GPTMermaidThemes.useTheme('linear');
 *     mermaid.initialize(GPTMermaidThemes.config('linear'));
 *   </script>
 *
 * 主题列表：linear（默认浅色）/ github / tokyo（深色）/ nord（深色）
 */
(function () {
  var FONT = '-apple-system,BlinkMacSystemFont,"PingFang SC","Helvetica Neue",Arial,sans-serif';

  // 只列 mermaid 真正用到的变量；其余由 theme 继承
  var THEMES = {
    linear: {
      label: 'Linear 浅色',
      dark: false,
      vars: {
        background: '#ffffff',
        primaryColor: '#eef2ff',
        primaryTextColor: '#1c1f23',
        primaryBorderColor: '#a9b6d6',
        secondaryColor: '#f6f8fc',
        tertiaryColor: '#ffffff',
        lineColor: '#8b95a7',
        clusterBkg: '#fafbfd',
        clusterBorder: '#cfd6e4',
        edgeLabelBackground: '#ffffff'
      }
    },
    github: {
      label: 'GitHub 浅色',
      dark: false,
      vars: {
        background: '#ffffff',
        primaryColor: '#f6f8fa',
        primaryTextColor: '#1f2328',
        primaryBorderColor: '#d0d7de',
        secondaryColor: '#ffffff',
        tertiaryColor: '#ffffff',
        lineColor: '#59636e',
        clusterBkg: '#f6f8fa',
        clusterBorder: '#d0d7de',
        edgeLabelBackground: '#ffffff'
      }
    },
    tokyo: {
      label: 'Tokyo Night 深色',
      dark: true,
      vars: {
        background: '#1a1b26',
        primaryColor: '#24283b',
        primaryTextColor: '#c0caf5',
        primaryBorderColor: '#3b4261',
        secondaryColor: '#1f2335',
        tertiaryColor: '#16161e',
        lineColor: '#7aa2f7',
        clusterBkg: '#1f2335',
        clusterBorder: '#3b4261',
        edgeLabelBackground: '#1a1b26'
      }
    },
    nord: {
      label: 'Nord 深色',
      dark: true,
      vars: {
        background: '#2e3440',
        primaryColor: '#3b4252',
        primaryTextColor: '#eceff4',
        primaryBorderColor: '#4c566a',
        secondaryColor: '#434c5e',
        tertiaryColor: '#2e3440',
        lineColor: '#88c0d0',
        clusterBkg: '#3b4252',
        clusterBorder: '#4c566a',
        edgeLabelBackground: '#2e3440'
      }
    }
  };

  var current = 'linear';

  function config(name) {
    var t = THEMES[name] || THEMES[current];
    return {
      theme: 'base',
      themeVariables: Object.assign({ fontFamily: FONT, fontSize: '13px' }, t.vars),
      flowchart: { curve: 'basis', nodeSpacing: 42, rankSpacing: 40, padding: 12, useMaxWidth: true }
    };
  }

  // 子图容器圆角：CSS 的 rx 对 <rect> 生效（SVG2 几何属性），比改绘图代码安全
  var CLUSTER_CSS = '.cluster rect, .cluster > rect { rx: 8px; ry: 8px; }';

  function ensureStyle(doc) {
    doc = doc || document;
    if (!doc.getElementById('gpt-mermaid-cluster-style')) {
      var st = doc.createElement('style');
      st.id = 'gpt-mermaid-cluster-style';
      st.textContent = CLUSTER_CSS;
      (doc.head || doc.documentElement).appendChild(st);
    }
  }

  // 渲染出来的 svg 内部也补一份，避免被嵌到别处时丢失文档级样式
  function ensureSvgStyle(svg) {
    if (!svg || !svg.querySelector || svg.querySelector('style[data-mr-cluster]')) return;
    var st = document.createElementNS('http://www.w3.org/2000/svg', 'style');
    st.setAttribute('data-mr-cluster', '1');
    st.textContent = CLUSTER_CSS;
    svg.appendChild(st);
  }

  function useTheme(name) {
    if (THEMES[name]) current = name;
    ensureStyle();
    return current;
  }

  function getTheme() { return current; }

  // 自动给插入页面的 svg 补圆角样式
  if (typeof MutationObserver !== 'undefined' && document.body) {
    ensureStyle();
    var obs = new MutationObserver(function (muts) {
      for (var i = 0; i < muts.length; i++) {
        var added = muts[i].addedNodes;
        for (var j = 0; j < added.length; j++) {
          var n = added[j];
          if (n.nodeType !== 1) continue;
          if (n.tagName && n.tagName.toLowerCase() === 'svg') ensureSvgStyle(n);
          else if (n.querySelectorAll) {
            Array.prototype.forEach.call(n.querySelectorAll('svg'), ensureSvgStyle);
          }
        }
      }
    });
    obs.observe(document.body, { childList: true, subtree: true });
    Array.prototype.forEach.call(document.querySelectorAll('svg'), ensureSvgStyle);
  } else if (typeof document !== 'undefined') {
    ensureStyle();
  }

  window.GPTMermaidThemes = {
    themes: THEMES,
    config: config,
    useTheme: useTheme,
    getTheme: getTheme,
    isDark: function () { return !!(THEMES[current] && THEMES[current].dark); }
  };
})();
