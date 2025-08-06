# 📝 ComfyUI Interactive Text Pause Node

A powerful ComfyUI custom node that allows interactive text editing in workflows with intelligent pre-execution and real-time pause capabilities.

## ✨ Key Features

### 🚀 **Smart Execution Modes**
- **Pre-execution Mode**: Instantly opens editor when clicking execute, no queue waiting
- **Runtime Mode**: Traditional pause-and-edit during workflow execution
- **Automatic Detection**: Intelligently chooses the best mode based on input type

### 💫 **Enhanced Text Editing**
- ✏️ **Rich Text Editor**: Beautiful interface with professional styling
- ✨ **Syntax Highlighting**: Support for Markdown, JSON, XML, JavaScript, Python, CSS, HTML
- 👁️ **Real-time Preview**: Live rendering of Markdown, JSON formatting, and code highlighting
- 🔍 **Smart Format Detection**: Auto-detect content format and suggest appropriate formatting
- 📊 **Advanced Text Analytics**:
  - Character count, word count, line count, paragraph count
  - Language detection (Chinese, English, Japanese, mixed)
  - Reading time estimation (based on 200 words/minute)
- 🎨 **Modern Dark UI**: Responsive design supporting multiple screen sizes
- ⌨️ **Keyboard Shortcuts**: 
  - `Ctrl+Enter` - Confirm changes
  - `Esc` - Cancel changes
- 🔄 **Reset Function**: One-click restore to original text

### 🛠️ **Smart Features**
- 🌱 **Seed Support**: Prevents ComfyUI caching, ensures repeated execution
- 🔗 **Pass-through Support**: Seamless integration with complex workflows
- ⚡ **Zero Queue Delay**: Edit text immediately, no waiting for previous tasks
- 📱 **Mobile Responsive**: Works perfectly on tablets and mobile devices

## 🚀 Installation

### Method 1: Direct Download (Recommended)
1. Download or clone this repository
2. Copy the entire `interactive_text_pause_node` folder to your ComfyUI `custom_nodes` directory
3. Restart ComfyUI

### Method 2: Git Clone
```bash
cd /path/to/ComfyUI/custom_nodes
git clone https://github.com/your-username/comfyui-interactive-text-pause-node.git interactive_text_pause_node
```

### Project Structure
```
ComfyUI/custom_nodes/interactive_text_pause_node/
├── __init__.py                           # Plugin entry point
├── interactive_text_pause_node.py        # Main node implementation
├── web/
│   ├── interactive_text_pause_node.js    # Frontend interaction logic
│   └── interactive_text_pause_node.css   # Interface styling
└── README.md                            # Documentation
```

## 📖 Usage Guide

### 1. Add the Node
In ComfyUI interface:
1. Right-click in an empty area
2. Navigate to `Add Node` → `📝 交互工具` → `📝 交互式文本暂停编辑器`

### 2. Node Connections
**Inputs:**
- `text`: Text content to edit (required)
- `seed`: Random seed to prevent caching (required)

**Outputs:**
- `text`: Edited text content

### 3. Execution Modes

#### 🚀 Pre-execution Mode (Instant)
When text is directly input into the node:
1. Click "Queue Prompt" 
2. **Editor opens immediately** (no waiting!)
3. Edit your text content
4. Click `✅ Confirm` 
5. Workflow executes with your edited text

#### ⏱️ Runtime Mode (Traditional)  
When text comes from connected nodes:
1. Workflow executes normally
2. **Editor opens when reaching this node**
3. Edit your text content
4. Click `✅ Confirm` to continue
5. Remaining workflow completes

### 4. Enhanced Editor Interface

#### Main Controls
- **Format Selector**: Choose from 8 different text formats (Plain Text, Markdown, JSON, XML, JavaScript, Python, CSS, HTML)
- **👁️ Preview Button**: Toggle between editing and preview modes
- **📊 Statistics Button**: Show/hide detailed text analytics panel

#### Text Editing Area
- **Smart Text Editor**: Multi-line editor with format-specific syntax highlighting
- **Live Preview Panel**: Real-time rendering of formatted content (Markdown, JSON, code)
- **Auto Format Detection**: Smart suggestions when pasting different content types

#### Action Buttons
- **✅ Confirm**: Apply changes and continue workflow
- **❌ Cancel**: Discard changes, use original text  
- **🔄 Reset**: Restore original text content

#### Information Panels
- **Status Bar**: Character count, line count, seed value, and session ID
- **Statistics Panel**: Detailed metrics including word count, paragraphs, language detection, and reading time
- **Smart Suggestions**: Format recommendations based on content analysis

## ⌨️ Keyboard Shortcuts

- `Ctrl+Enter`: Quick confirm changes
- `Esc`: Quick cancel/use original text
- Click outside editor: Cancel changes

## 💡 Pro Tips

### 🎯 Best Practices
- **Use seed values**: Change the seed value (0 → 1 → 2...) to force re-execution with the same text
- **Pre-edit workflow**: For fastest editing, input text directly into the node rather than connecting from other nodes  
- **Batch editing**: The node works great in loops for processing multiple texts
- **Mobile editing**: The responsive interface works well on tablets for on-the-go editing

### 🔄 Workflow Examples

**Simple Text Editing:**
```
Text Input → Interactive Editor → Show Text
```

**AI Content Refinement:**
```  
AI Text Generator → Interactive Editor → Final Output
```

**Batch Processing:**
```
Text List → Loop → Interactive Editor → Processed Results
```

**JSON Data Processing:**
```
API Response → Interactive Editor (JSON format) → Formatted Output
```

**Markdown Documentation:**
```
Draft Text → Interactive Editor (Markdown format) → HTML Preview → Final Document
```

### 🎯 Format-Specific Usage Tips

#### 📝 **Markdown Editing**
- Paste Markdown content and select "Markdown" format for live preview
- See rendered headers, lists, links, and code blocks in real-time
- Perfect for documentation and content creation

#### 🔧 **JSON Processing** 
- Automatic format validation and beautification
- Clear error messages when JSON is invalid
- Auto-suggest JSON format when pasting object/array data

#### 💻 **Code Editing**
- Syntax highlighting for JavaScript, Python, CSS, HTML
- Format detection suggests appropriate language
- Ideal for prompt engineering and code generation workflows

#### 📊 **Text Analytics**
- View detailed statistics: character/word/line counts
- Language detection for multilingual content
- Reading time estimation for content planning

## 🐛 Troubleshooting

### Common Issues

**Q: Node doesn't appear in the menu?**
A: Please ensure:
1. Folder name is correct: `interactive_text_pause_node`  
2. ComfyUI has been restarted
3. Check console for any error messages

**Q: Editor interface doesn't show?**  
A: Please check:
1. Browser console for JavaScript errors
2. CSS files are loading correctly
3. ComfyUI version compatibility

**Q: Editor opens but changes don't apply?**
A: Try:
1. Change the seed value to force re-execution
2. Check if text is coming from a connected node (uses runtime mode)
3. Verify the workflow completed successfully

## 🔧 Technical Details

**Requirements:**
- ComfyUI (latest version recommended)
- Modern web browser with JavaScript enabled

**Architecture:**
- **Backend**: Python with asyncio for real-time communication
- **Frontend**: Vanilla JavaScript with modern CSS
- **Communication**: RESTful API + WebSocket events

## 🔮 Roadmap

### ✅ Recently Implemented
- [x] **Syntax Highlighting**: Support for Markdown, JSON, XML, JavaScript, Python, CSS, HTML
- [x] **Real-time Preview**: Live rendering of formatted content  
- [x] **Advanced Text Analytics**: Word count, language detection, reading time estimation
- [x] **Smart Format Detection**: Auto-detect content format and suggest switching
- [x] **Enhanced Error Handling**: User-friendly error messages with formatting tips

### 🚧 In Development
- [ ] **AI-Powered Text Enhancement**: GPT integration for content improvement
- [ ] **Text Template System**: Pre-defined templates for common use cases
- [ ] **Edit History**: Undo/redo functionality with change tracking
- [ ] **Theme Customization**: Multiple editor themes and color schemes

### 🌟 Future Features
- [ ] **Collaborative Editing**: Real-time multi-user editing
- [ ] **Plugin API**: Custom text processors and extensions
- [ ] **Advanced Validation**: Schema validation for JSON/XML
- [ ] **Export/Import**: Save/load text templates and presets
- [ ] **Custom Shortcuts**: User-defined keyboard shortcuts

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

We welcome bug reports and feature requests! To contribute code:

1. Fork this repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 🆘 Support

For support:
1. Check this README documentation
2. Search existing [GitHub Issues](../../issues)
3. Create a new issue with detailed information
4. Join the ComfyUI community discussions

## ⭐ Show Your Support

If this plugin helps your workflow, please consider:
- ⭐ Starring this repository
- 🐛 Reporting bugs and issues
- 💡 Suggesting new features
- 📢 Sharing with other ComfyUI users

---

**Note**: This is a community-developed plugin, not affiliated with the official ComfyUI team. Please backup your important workflow files before use. 