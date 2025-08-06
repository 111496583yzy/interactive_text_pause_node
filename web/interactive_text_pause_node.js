import { app } from "../../scripts/app.js";
import { ComfyWidgets } from "../../scripts/widgets.js";
import { api } from "../../scripts/api.js";

const link = document.createElement("link");
link.rel = "stylesheet";
link.type = "text/css";
link.href = "extensions/interactive_text_pause_node/interactive_text_pause_node.css";
document.head.appendChild(link);

// 加载外部库
const highlightCss = document.createElement("link");
highlightCss.rel = "stylesheet";
highlightCss.href = "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css";
document.head.appendChild(highlightCss);

const highlightJs = document.createElement("script");
highlightJs.src = "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js";
document.head.appendChild(highlightJs);

const markedJs = document.createElement("script");
markedJs.src = "https://cdnjs.cloudflare.com/ajax/libs/marked/9.1.6/marked.min.js";
document.head.appendChild(markedJs);

app.registerExtension({
    name: "InteractiveTextPauseNode",
    
    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name === "InteractiveTextPauseNode") {
            const onNodeCreated = nodeType.prototype.onNodeCreated;
            
            nodeType.prototype.onNodeCreated = function() {
                const r = onNodeCreated ? onNodeCreated.apply(this, arguments) : undefined;
                
                this.title = "📝 交互式文本暂停编辑器";
                
                return r;
            };
        }
    }
});

let currentEditSession = null;
let editOverlay = null;
let pendingEdits = new Map();

api.addEventListener("interactive_text_pause", (event) => {
    const { session_id, text, node_id, seed } = event.detail;
    console.log("[交互式文本暂停] 收到暂停信号:", { session_id, text, node_id, seed });
    
    showTextEditor(session_id, text, node_id, seed);
});

api.addEventListener("execution_start", (event) => {
    console.log("[交互式文本暂停] 工作流开始执行");
    checkForInteractiveNodes();
});

function checkForInteractiveNodes() {
    try {
        const workflow = app.graph;
        if (!workflow) return;
        
        const interactiveNodes = workflow._nodes.filter(node => 
            node.type === "InteractiveTextPauseNode"
        );
        
        console.log(`[交互式文本暂停] 发现 ${interactiveNodes.length} 个交互式节点`);
        
        interactiveNodes.forEach(node => {
            preProcessInteractiveNode(node);
        });
        
    } catch (error) {
        console.error("[交互式文本暂停] 检查交互式节点时出错:", error);
    }
}

function preProcessInteractiveNode(node) {
    try {
        let text = "";
        let seed = 0;
        
        if (node.widgets) {
            const textWidget = node.widgets.find(w => w.name === "text");
            const seedWidget = node.widgets.find(w => w.name === "seed");
            
            if (textWidget) {
                text = textWidget.value || "";
            }
            if (seedWidget) {
                seed = seedWidget.value || 0;
            }
        }
        
        if (!text && node.inputs) {
            const textInput = node.inputs.find(input => input.name === "text");
            if (textInput && textInput.link) {
                console.log(`[交互式文本暂停] 节点 ${node.id} 的文本输入来自连接，无法预处理`);
                return;
            }
        }
        
        if (text) {
            const sessionId = `pre_${node.id}_${Date.now()}`;
            
            console.log(`[交互式文本暂停] 预处理节点 ${node.id}, 文本长度: ${text.length}`);
            
            showTextEditor(sessionId, text, node.id, seed, true);
            
            pendingEdits.set(node.id, {
                sessionId,
                originalText: text,
                seed
            });
        } else {
            console.log(`[交互式文本暂停] 节点 ${node.id} 没有可预处理的文本`);
        }
    } catch (error) {
        console.error("[交互式文本暂停] 预处理节点时出错:", error);
    }
}

function showTextEditor(sessionId, initialText, nodeId, seed = 0, isPreExecution = false) {
    if (currentEditSession) {
        closeTextEditor();
    }
    
    currentEditSession = sessionId;
    
    editOverlay = document.createElement('div');
    editOverlay.className = 'interactive-text-overlay';
    editOverlay.innerHTML = `
        <div class="interactive-text-modal enhanced">
            <div class="interactive-text-header">
                <h3>📝 智能文本编辑器 ${isPreExecution ? '(预编辑模式)' : ''}</h3>
                <p>${isPreExecution ? '队列执行前预编辑 - 修改文本后将直接用于工作流执行' : '修改文本后点击"确认"继续ComfyUI工作流程'}</p>
                <div class="editor-controls">
                    <select id="text-format" class="format-select">
                        <option value="text">纯文本</option>
                        <option value="markdown">Markdown</option>
                        <option value="json">JSON</option>
                        <option value="xml">XML</option>
                        <option value="javascript">JavaScript</option>
                        <option value="python">Python</option>
                        <option value="css">CSS</option>
                        <option value="html">HTML</option>
                    </select>
                    <button id="preview-toggle" class="preview-btn">👁️ 预览</button>
                    <button id="stats-toggle" class="stats-btn">📊 统计</button>
                </div>
            </div>
            
            <div class="interactive-text-content">
                <div class="editor-wrapper">
                    <textarea 
                        id="interactive-text-input" 
                        class="interactive-text-textarea"
                        placeholder="在此编辑您的文本..."
                    >${initialText}</textarea>
                    <div id="text-preview" class="text-preview hidden">
                        <div class="preview-content"></div>
                    </div>
                </div>
                <div id="text-stats" class="text-stats hidden">
                    <div class="stats-content">
                        <div class="stat-item">
                            <span class="stat-label">字符数:</span>
                            <span id="char-count">0</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">单词数:</span>
                            <span id="word-count">0</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">行数:</span>
                            <span id="line-count">0</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">段落数:</span>
                            <span id="paragraph-count">0</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">语言:</span>
                            <span id="detected-language">检测中...</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">阅读时间:</span>
                            <span id="reading-time">0分钟</span>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="interactive-text-actions">
                <button id="interactive-text-confirm" class="interactive-text-btn confirm">
                    ✅ 确认修改
                </button>
                <button id="interactive-text-cancel" class="interactive-text-btn cancel">
                    ❌ 取消
                </button>
                <button id="interactive-text-reset" class="interactive-text-btn reset">
                    🔄 重置
                </button>
            </div>
            
            <div class="interactive-text-footer">
                <span id="interactive-text-status">
                    字符数: ${initialText.length} | 种子: ${seed} | 会话ID: ${sessionId.slice(0, 8)}...
                </span>
            </div>
        </div>
    `;
    
    document.body.appendChild(editOverlay);
    
    const textarea = document.getElementById('interactive-text-input');
    const confirmBtn = document.getElementById('interactive-text-confirm');
    const cancelBtn = document.getElementById('interactive-text-cancel');
    const resetBtn = document.getElementById('interactive-text-reset');
    const statusSpan = document.getElementById('interactive-text-status');
    const formatSelect = document.getElementById('text-format');
    const previewToggle = document.getElementById('preview-toggle');
    const statsToggle = document.getElementById('stats-toggle');
    const textPreview = document.getElementById('text-preview');
    const textStats = document.getElementById('text-stats');
    
    textarea.focus();
    textarea.select();
    
    // 等待库加载完成
    let librariesLoaded = false;
    const checkLibraries = () => {
        if (window.hljs && window.marked) {
            librariesLoaded = true;
            window.hljs.highlightAll();
        } else {
            setTimeout(checkLibraries, 100);
        }
    };
    checkLibraries();
    
    function updateStatus() {
        const text = textarea.value;
        const charCount = text.length;
        const lineCount = text.split('\n').length;
        statusSpan.textContent = `字符数: ${charCount} | 行数: ${lineCount} | 种子: ${seed} | 会话ID: ${sessionId.slice(0, 8)}...`;
    }
    
    function updateTextStats() {
        const text = textarea.value;
        const charCount = text.length;
        const wordCount = text.trim().split(/\s+/).filter(word => word.length > 0).length;
        const lineCount = text.split('\n').length;
        const paragraphCount = text.split('\n\n').filter(p => p.trim().length > 0).length;
        const readingTime = Math.ceil(wordCount / 200); // 假设每分钟200词
        
        document.getElementById('char-count').textContent = charCount;
        document.getElementById('word-count').textContent = wordCount;
        document.getElementById('line-count').textContent = lineCount;
        document.getElementById('paragraph-count').textContent = paragraphCount;
        document.getElementById('reading-time').textContent = readingTime + '分钟';
        
        // 简单语言检测
        detectLanguage(text);
    }
    
    function detectLanguage(text) {
        const langSpan = document.getElementById('detected-language');
        if (!text.trim()) {
            langSpan.textContent = '无内容';
            return;
        }
        
        // 简单的语言检测逻辑
        const chineseChars = (text.match(/[\u4e00-\u9fff]/g) || []).length;
        const englishWords = (text.match(/[a-zA-Z]+/g) || []).length;
        const japaneseChars = (text.match(/[\u3040-\u309f\u30a0-\u30ff]/g) || []).length;
        
        if (chineseChars > englishWords && chineseChars > japaneseChars) {
            langSpan.textContent = '中文';
        } else if (englishWords > chineseChars && englishWords > japaneseChars) {
            langSpan.textContent = '英文';
        } else if (japaneseChars > 0) {
            langSpan.textContent = '日文';
        } else {
            langSpan.textContent = '混合/其他';
        }
    }
    
    function updatePreview() {
        if (!librariesLoaded) return;
        
        const format = formatSelect.value;
        const text = textarea.value;
        const previewContent = textPreview.querySelector('.preview-content');
        
        try {
            switch (format) {
                case 'markdown':
                    if (!text.trim()) {
                        previewContent.innerHTML = '<div class="preview-hint">💡 请输入Markdown文本进行预览</div>';
                        break;
                    }
                    previewContent.innerHTML = window.marked.parse(text);
                    break;
                case 'json':
                    if (!text.trim()) {
                        previewContent.innerHTML = '<div class="preview-hint">💡 请输入JSON文本进行预览</div>';
                        break;
                    }
                    
                    // 检查是否看起来像JSON
                    const trimmed = text.trim();
                    if (!trimmed.startsWith('{') && !trimmed.startsWith('[') && !trimmed.startsWith('"') && !(/^(true|false|null|\d+)$/.test(trimmed))) {
                        previewContent.innerHTML = `
                            <div class="json-error">
                                <div class="error-icon">⚠️</div>
                                <div class="error-title">这不是有效的JSON格式</div>
                                <div class="error-desc">JSON格式应该是：</div>
                                <div class="error-examples">
                                    <div>• 对象: <code>{"key": "value"}</code></div>
                                    <div>• 数组: <code>["item1", "item2"]</code></div>
                                    <div>• 字符串: <code>"text"</code></div>
                                    <div>• 数字: <code>123</code></div>
                                    <div>• 布尔值: <code>true</code> 或 <code>false</code></div>
                                </div>
                                <div class="error-suggestion">
                                    💡 建议：如果是普通文本，请选择"纯文本"格式
                                </div>
                            </div>
                        `;
                        break;
                    }
                    
                    const formatted = JSON.stringify(JSON.parse(text), null, 2);
                    previewContent.innerHTML = `<pre><code class="language-json">${formatted}</code></pre>`;
                    window.hljs.highlightAll();
                    break;
                case 'xml':
                case 'html':
                case 'javascript':
                case 'python':
                case 'css':
                    if (!text.trim()) {
                        previewContent.innerHTML = `<div class="preview-hint">💡 请输入${format.toUpperCase()}代码进行预览</div>`;
                        break;
                    }
                    previewContent.innerHTML = `<pre><code class="language-${format}">${text}</code></pre>`;
                    window.hljs.highlightAll();
                    break;
                default:
                    previewContent.innerHTML = `<pre>${text}</pre>`;
            }
        } catch (e) {
            if (format === 'json') {
                previewContent.innerHTML = `
                    <div class="json-error">
                        <div class="error-icon">❌</div>
                        <div class="error-title">JSON解析错误</div>
                        <div class="error-desc">${e.message}</div>
                        <div class="error-suggestion">
                            💡 请检查JSON格式是否正确：
                            <br>• 字符串需要用双引号包围
                            <br>• 对象键名需要用双引号
                            <br>• 不要有多余的逗号
                        </div>
                    </div>
                `;
            } else {
                previewContent.innerHTML = `<div class="preview-error">⚠️ 预览错误: ${e.message}</div>`;
            }
        }
    }
    
    // 事件监听
    textarea.addEventListener('input', () => {
        updateStatus();
        updateTextStats();
        if (!textPreview.classList.contains('hidden')) {
            updatePreview();
        }
    });
    
    // 自动格式检测（粘贴时）
    textarea.addEventListener('paste', () => {
        setTimeout(() => {
            const text = textarea.value.trim();
            if (text && formatSelect.value === 'text') {
                const detectedFormat = detectTextFormat(text);
                if (detectedFormat !== 'text') {
                    showAutoFormatSuggestion(detectedFormat);
                }
            }
        }, 100);
    });
    
    function showAutoFormatSuggestion(detectedFormat) {
        const formatNames = {
            'markdown': 'Markdown',
            'json': 'JSON',
            'html': 'HTML',
            'xml': 'XML',
            'css': 'CSS',
            'javascript': 'JavaScript',
            'python': 'Python'
        };
        
        // 移除已存在的建议
        const existing = document.querySelector('.format-suggestion');
        if (existing) existing.remove();
        
        const suggestion = document.createElement('div');
        suggestion.className = 'format-suggestion auto-detect';
        suggestion.innerHTML = `
            <span>🔍 检测到 <strong>${formatNames[detectedFormat]}</strong> 格式，是否切换？</span>
            <button class="suggestion-btn accept">切换</button>
            <button class="suggestion-btn dismiss">保持纯文本</button>
        `;
        
        formatSelect.parentNode.appendChild(suggestion);
        
        suggestion.querySelector('.accept').addEventListener('click', () => {
            formatSelect.value = detectedFormat;
            updatePreview();
            suggestion.remove();
        });
        
        suggestion.querySelector('.dismiss').addEventListener('click', () => {
            suggestion.remove();
        });
        
        // 8秒后自动消失
        setTimeout(() => {
            if (suggestion.parentNode) {
                suggestion.remove();
            }
        }, 8000);
    }
    
    formatSelect.addEventListener('change', () => {
        if (!textPreview.classList.contains('hidden')) {
            updatePreview();
        }
        
        // 智能格式提示
        const selectedFormat = formatSelect.value;
        const text = textarea.value.trim();
        
        if (text && selectedFormat !== 'text') {
            setTimeout(() => {
                suggestBetterFormat(text, selectedFormat);
            }, 100);
        }
    });
    
    function suggestBetterFormat(text, currentFormat) {
        const detectedFormat = detectTextFormat(text);
        
        if (detectedFormat && detectedFormat !== currentFormat && detectedFormat !== 'text') {
            showFormatSuggestion(detectedFormat, currentFormat);
        }
    }
    
    function detectTextFormat(text) {
        // 检测Markdown
        if (/^#+\s|^\*\s|^\d+\.\s|^>\s|```|^-{3,}|^\[.*\]\(.*\)/m.test(text)) {
            return 'markdown';
        }
        
        // 检测JSON
        const trimmed = text.trim();
        if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || 
            (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
            try {
                JSON.parse(text);
                return 'json';
            } catch (e) {}
        }
        
        // 检测HTML
        if (/<[^>]+>/g.test(text) && /<\/[^>]+>/g.test(text)) {
            return 'html';
        }
        
        // 检测XML
        if (/<\?xml|<[^>]+xmlns/g.test(text)) {
            return 'xml';
        }
        
        // 检测CSS
        if (/[.#][a-zA-Z-_][^{]*\{[^}]*\}/g.test(text)) {
            return 'css';
        }
        
        // 检测JavaScript
        if (/\b(function|const|let|var|class|import|export)\b/g.test(text)) {
            return 'javascript';
        }
        
        // 检测Python
        if (/\b(def|class|import|from|if __name__|print\()\b/g.test(text)) {
            return 'python';
        }
        
        return 'text';
    }
    
    function showFormatSuggestion(suggested, current) {
        // 移除已存在的建议
        const existing = document.querySelector('.format-suggestion');
        if (existing) existing.remove();
        
        const formatNames = {
            'markdown': 'Markdown',
            'json': 'JSON',
            'html': 'HTML',
            'xml': 'XML',
            'css': 'CSS',
            'javascript': 'JavaScript',
            'python': 'Python'
        };
        
        // 创建临时提示
        const suggestion = document.createElement('div');
        suggestion.className = 'format-suggestion';
        suggestion.innerHTML = `
            <span>💡 建议切换为 <strong>${formatNames[suggested]}</strong> 格式</span>
            <button class="suggestion-btn accept">切换</button>
            <button class="suggestion-btn dismiss">×</button>
        `;
        
        // 插入到格式选择器旁边
        formatSelect.parentNode.appendChild(suggestion);
        
        // 事件监听
        suggestion.querySelector('.accept').addEventListener('click', () => {
            formatSelect.value = suggested;
            updatePreview();
            suggestion.remove();
        });
        
        suggestion.querySelector('.dismiss').addEventListener('click', () => {
            suggestion.remove();
        });
        
        // 5秒后自动消失
        setTimeout(() => {
            if (suggestion.parentNode) {
                suggestion.remove();
            }
        }, 5000);
    }
    
    previewToggle.addEventListener('click', () => {
        textPreview.classList.toggle('hidden');
        if (!textPreview.classList.contains('hidden')) {
            updatePreview();
            previewToggle.textContent = '📝 编辑';
        } else {
            previewToggle.textContent = '👁️ 预览';
        }
    });
    
    statsToggle.addEventListener('click', () => {
        textStats.classList.toggle('hidden');
        if (!textStats.classList.contains('hidden')) {
            updateTextStats();
            statsToggle.textContent = '❌ 关闭';
        } else {
            statsToggle.textContent = '📊 统计';
        }
    });
    
    // 初始化统计
    updateTextStats();
    
    confirmBtn.addEventListener('click', () => {
        confirmTextEdit(sessionId, textarea.value, isPreExecution, nodeId);
    });
    
    cancelBtn.addEventListener('click', () => {
        confirmTextEdit(sessionId, initialText, isPreExecution, nodeId);
    });
    
    resetBtn.addEventListener('click', () => {
        textarea.value = initialText;
        updateStatus();
        textarea.focus();
    });
    
    textarea.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'Enter') {
            e.preventDefault();
            confirmTextEdit(sessionId, textarea.value, isPreExecution, nodeId);
        } else if (e.key === 'Escape') {
            e.preventDefault();
            confirmTextEdit(sessionId, initialText, isPreExecution, nodeId);
        }
    });
    
    editOverlay.addEventListener('click', (e) => {
        if (e.target === editOverlay) {
            confirmTextEdit(sessionId, initialText, isPreExecution, nodeId);
        }
    });
    
    updateStatus();
}

async function confirmTextEdit(sessionId, editedText, isPreExecution = false, nodeId = null) {
    try {
        if (isPreExecution) {
            console.log(`[交互式文本暂停] 预编辑完成，节点ID: ${nodeId}`);
            console.log(`[交互式文本暂停] 编辑后文本长度: ${editedText.length}`);
            
            const editData = pendingEdits.get(nodeId);
            if (editData) {
                const preEditResponse = await fetch('/interactive_text/pre_edit', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        node_id: nodeId,
                        original_text: editData.originalText,
                        seed: editData.seed,
                        edited_text: editedText
                    })
                });
                
                if (preEditResponse.ok) {
                    console.log("[交互式文本暂停] 预编辑结果已发送到后端");
                } else {
                    console.error("[交互式文本暂停] 预编辑结果发送失败:", preEditResponse.status);
                }
            }
            
            closeTextEditor();
            
            console.log("[交互式文本暂停] 预编辑完成，等待工作流执行");
            return;
        }
        
        const response = await fetch('/interactive_text/confirm', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                session_id: sessionId,
                text: editedText,
                is_pre_execution: false
            })
        });
        
        if (response.ok) {
            const result = await response.json();
            console.log("[交互式文本暂停] 编辑确认成功:", result);
            
            closeTextEditor();
            
            console.log("[交互式文本暂停] 文本编辑已提交，工作流将继续执行");
            
        } else {
            console.error("[交互式文本暂停] 编辑确认失败:", response.status);
            alert("编辑确认失败，请重试");
        }
        
    } catch (error) {
        console.error("[交互式文本暂停] 网络错误:", error);
        alert("网络错误，请重试");
    }
}

function closeTextEditor() {
    if (editOverlay) {
        document.body.removeChild(editOverlay);
        editOverlay = null;
    }
    currentEditSession = null;
}

window.addEventListener('beforeunload', () => {
    closeTextEditor();
}); 