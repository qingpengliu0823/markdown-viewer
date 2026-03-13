const markdownit = require('markdown-it');
const texmath = require('markdown-it-texmath');
const katex = require('katex');
const hljs = require('highlight.js');

const md = markdownit({
  html: true,
  linkify: true,
  typographer: true,
  highlight(str, lang) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(str, { language: lang }).value;
      } catch (_) {}
    }
    return '';
  },
});

md.use(texmath, { engine: katex, delimiters: 'dollars' });

// Task list support (mirrors client-side renderer.js)
md.core.ruler.after('inline', 'task-lists', (state) => {
  const tokens = state.tokens;
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i].type !== 'inline') continue;
    const content = tokens[i].content;
    if (/^\[[ x]\]\s/.test(content)) {
      const checked = content[1] === 'x';
      tokens[i].content = content.slice(3).trimStart();
      for (let j = i - 1; j >= 0; j--) {
        if (tokens[j].type === 'list_item_open') {
          tokens[j].attrJoin('class', 'task-list-item');
          break;
        }
      }
      const checkToken = new state.Token('html_inline', '', 0);
      checkToken.content = `<input type="checkbox" disabled${checked ? ' checked' : ''}> `;
      tokens[i].children.unshift(checkToken);
    }
  }
});

function render(markdownString) {
  return md.render(markdownString);
}

module.exports = { render };
