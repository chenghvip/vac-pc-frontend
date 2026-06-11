// src/utils/markdownFactory.js
import MarkdownIt from 'markdown-it'
import hljs from 'highlight.js'

class MarkdownFactory {
    static instance = null

    static getInstance() {
        if (!this.instance) {
            this.instance = new MarkdownIt({
                html: true,
                linkify: true,
                breaks: false,
                typographer: true,
                highlight: (str, lang) => {
                    if (lang && hljs.getLanguage(lang)) {
                        try {
                            return '<pre class="hljs"><code>' +
                                hljs.highlight(str, { language: lang, ignoreIllegals: true }).value +
                                '</code></pre>'
                        } catch (e) {
                            console.warn('Syntax highlighting failed:', e)
                        }
                    }
                    return '<pre class="hljs"><code>' + this.instance.utils.escapeHtml(str) + '</code></pre>'
                }
            })

            // 启用功能
            this.instance.enable('table')
            // 自定义渲染器
            this.instance.renderer.rules.text_special = (tokens, idx) => {
                return this.instance.utils.escapeHtml(tokens[idx].content)
            }
        }
        return this.instance
    }
}

export default MarkdownFactory
