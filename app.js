// osonai - AI Instagram Post Generator
class OsonaiApp {
    constructor() {
        this.currentPost = {
            prompt: '',
            image: null,
            title: 'Your Title Here',
            subtitle: 'Your subtitle here',
            caption: '',
            hashtags: [],
            aspectRatio: '1:1'
        };
        
        this.selectedTextElement = null;
        this.isDragging = false;
        this.isResizing = false;
        this.dragOffset = { x: 0, y: 0 };
        this.resizeHandle = null;
        this.initialSize = { width: 0, height: 0 };
        this.initialPosition = { x: 0, y: 0 };
        
        this.init();
    }

    init() {
        this.bindEvents();
        this.initDragAndDrop();
        this.setupTextEditing();
    }

    bindEvents() {
        // Generate button
        document.getElementById('generateBtn').addEventListener('click', () => {
            this.generatePost();
        });

        // Regenerate buttons
        document.getElementById('regenerateBtn').addEventListener('click', () => {
            this.regeneratePost();
        });

        document.getElementById('regenerateImage').addEventListener('click', () => {
            this.regenerateImage();
        });

        // Export buttons
        document.getElementById('exportBtn').addEventListener('click', () => {
            this.showExportModal();
        });

        document.getElementById('exportPNG').addEventListener('click', () => {
            this.exportAsImage('png');
        });

        document.getElementById('exportJPG').addEventListener('click', () => {
            this.exportAsImage('jpg');
        });

        // Copy caption
        document.getElementById('copyCaption').addEventListener('click', () => {
            this.copyCaption();
        });

        // Modal controls
        document.getElementById('closeModal').addEventListener('click', () => {
            this.hideExportModal();
        });

        document.getElementById('exportModal').addEventListener('click', (e) => {
            if (e.target.id === 'exportModal') {
                this.hideExportModal();
            }
        });

        // Aspect ratio controls
        document.querySelectorAll('.aspect-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.changeAspectRatio(e.target.dataset.ratio);
            });
        });

        // Text styling controls
        document.getElementById('fontTemplate').addEventListener('change', (e) => {
            this.updateTextStyle('fontFamily', e.target.value);
        });

        document.getElementById('fontSize').addEventListener('input', (e) => {
            this.updateTextStyle('fontSize', e.target.value + 'px');
            document.getElementById('fontSizeValue').textContent = e.target.value + 'px';
        });

        document.getElementById('textColor').addEventListener('change', (e) => {
            this.updateTextStyle('color', e.target.value);
        });

        document.getElementById('textShadow').addEventListener('change', (e) => {
            this.updateTextStyle('textShadow', e.target.checked);
        });

        // Alignment buttons
        document.querySelectorAll('.align-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.align-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.updateTextStyle('textAlign', e.target.dataset.align);
            });
        });

        // Image upload
        document.getElementById('uploadImage').addEventListener('click', () => {
            document.getElementById('imageUpload').click();
        });

        document.getElementById('imageUpload').addEventListener('change', (e) => {
            this.handleImageUpload(e.target.files[0]);
        });

        // Enter key in prompt
        document.getElementById('promptInput').addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.generatePost();
            }
        });
    }

    setupTextEditing() {
        const textOverlays = document.querySelectorAll('.text-overlay');
        
        textOverlays.forEach(overlay => {
            const textContent = overlay.querySelector('.text-content');
            
            // Click to select
            overlay.addEventListener('click', (e) => {
                e.stopPropagation();
                this.selectTextElement(overlay);
            });

            // Text editing
            textContent.addEventListener('input', (e) => {
                this.updatePostText(overlay.id, e.target.textContent);
            });

            textContent.addEventListener('blur', () => {
                this.saveTextChanges();
            });

            // Control buttons
            const editBtn = overlay.querySelector('[data-action="edit"]');
            const styleBtn = overlay.querySelector('[data-action="style"]');

            editBtn?.addEventListener('click', (e) => {
                e.stopPropagation();
                textContent.focus();
                this.selectAllText(textContent);
            });

            styleBtn?.addEventListener('click', (e) => {
                e.stopPropagation();
                this.selectTextElement(overlay);
            });
        });

        // Click outside to deselect
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.text-overlay') && !e.target.closest('.side-panel')) {
                this.deselectTextElement();
            }
        });
    }

    initDragAndDrop() {
        const textOverlays = document.querySelectorAll('.text-overlay');
        
        textOverlays.forEach(overlay => {
            // Handle dragging
            overlay.addEventListener('mousedown', (e) => {
                if (e.target.classList.contains('text-content') && e.target.isContentEditable) {
                    return; // Don't drag when editing text
                }
                
                if (e.target.classList.contains('resize-handle')) {
                    this.startResize(e, overlay, e.target);
                } else {
                    this.startDrag(e, overlay);
                }
            });

            // Handle resize handles
            const resizeHandles = overlay.querySelectorAll('.resize-handle');
            resizeHandles.forEach(handle => {
                handle.addEventListener('mousedown', (e) => {
                    e.stopPropagation();
                    this.startResize(e, overlay, handle);
                });
            });
        });

        document.addEventListener('mousemove', (e) => {
            if (this.isDragging) {
                this.drag(e);
            } else if (this.isResizing) {
                this.resize(e);
            }
        });

        document.addEventListener('mouseup', () => {
            this.stopDrag();
            this.stopResize();
        });
    }

    startDrag(e, element) {
        this.isDragging = true;
        this.selectedTextElement = element;
        element.classList.add('dragging');
        
        const rect = element.getBoundingClientRect();
        const canvasRect = document.getElementById('canvas').getBoundingClientRect();
        
        this.dragOffset = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
        
        e.preventDefault();
    }

    drag(e) {
        if (!this.isDragging || !this.selectedTextElement) return;
        
        const canvas = document.getElementById('canvas');
        const canvasRect = canvas.getBoundingClientRect();
        
        const x = e.clientX - canvasRect.left - this.dragOffset.x;
        const y = e.clientY - canvasRect.top - this.dragOffset.y;
        
        // Constrain to canvas bounds
        const dragElementRect = this.selectedTextElement.getBoundingClientRect();
        const maxX = canvas.offsetWidth - dragElementRect.width;
        const maxY = canvas.offsetHeight - dragElementRect.height;
        
        const constrainedX = Math.max(0, Math.min(x, maxX));
        const constrainedY = Math.max(0, Math.min(y, maxY));
        
        this.selectedTextElement.style.left = constrainedX + 'px';
        this.selectedTextElement.style.top = constrainedY + 'px';
        this.selectedTextElement.style.transform = 'none';
        
        // Show alignment guides and measurements during drag
        const currentElementRect = this.selectedTextElement.getBoundingClientRect();
        const relativeWidth = currentElementRect.width;
        const relativeHeight = currentElementRect.height;
        this.showAlignmentGuides(constrainedX, constrainedY, relativeWidth, relativeHeight);
        this.showMeasurementDisplay(relativeWidth, relativeHeight, constrainedX, constrainedY);
    }

    stopDrag() {
        if (this.selectedTextElement) {
            this.selectedTextElement.classList.remove('dragging');
        }
        this.isDragging = false;
        this.hideAlignmentGuides();
        this.hideMeasurementDisplay();
    }

    startResize(e, element, handle) {
        this.isResizing = true;
        this.selectedTextElement = element;
        this.resizeHandle = handle;
        element.classList.add('resizing');
        
        const rect = element.getBoundingClientRect();
        const canvasRect = document.getElementById('canvas').getBoundingClientRect();
        
        this.initialSize = {
            width: element.offsetWidth,
            height: element.offsetHeight
        };
        
        this.initialPosition = {
            x: rect.left - canvasRect.left,
            y: rect.top - canvasRect.top
        };
        
        this.dragOffset = {
            x: e.clientX,
            y: e.clientY
        };
        
        e.preventDefault();
        this.selectTextElement(element);
    }

    resize(e) {
        if (!this.isResizing || !this.selectedTextElement || !this.resizeHandle) return;
        
        const deltaX = e.clientX - this.dragOffset.x;
        const deltaY = e.clientY - this.dragOffset.y;
        const handleClass = this.resizeHandle.classList[1]; // Get the direction class
        
        let newWidth = this.initialSize.width;
        let newHeight = this.initialSize.height;
        let newLeft = this.initialPosition.x;
        let newTop = this.initialPosition.y;
        
        // Calculate new dimensions based on handle direction
        switch (handleClass) {
            case 'nw':
                newWidth = this.initialSize.width - deltaX;
                newHeight = this.initialSize.height - deltaY;
                newLeft = this.initialPosition.x + deltaX;
                newTop = this.initialPosition.y + deltaY;
                break;
            case 'n':
                newHeight = this.initialSize.height - deltaY;
                newTop = this.initialPosition.y + deltaY;
                break;
            case 'ne':
                newWidth = this.initialSize.width + deltaX;
                newHeight = this.initialSize.height - deltaY;
                newTop = this.initialPosition.y + deltaY;
                break;
            case 'w':
                newWidth = this.initialSize.width - deltaX;
                newLeft = this.initialPosition.x + deltaX;
                break;
            case 'e':
                newWidth = this.initialSize.width + deltaX;
                break;
            case 'sw':
                newWidth = this.initialSize.width - deltaX;
                newHeight = this.initialSize.height + deltaY;
                newLeft = this.initialPosition.x + deltaX;
                break;
            case 's':
                newHeight = this.initialSize.height + deltaY;
                break;
            case 'se':
                newWidth = this.initialSize.width + deltaX;
                newHeight = this.initialSize.height + deltaY;
                break;
        }
        
        // Apply minimum constraints
        newWidth = Math.max(100, newWidth);
        newHeight = Math.max(40, newHeight);
        
        // Apply maximum constraints (canvas bounds)
        const canvas = document.getElementById('canvas');
        const maxWidth = canvas.offsetWidth - newLeft;
        const maxHeight = canvas.offsetHeight - newTop;
        
        newWidth = Math.min(newWidth, maxWidth);
        newHeight = Math.min(newHeight, maxHeight);
        
        // Ensure element stays within canvas bounds
        newLeft = Math.max(0, Math.min(newLeft, canvas.offsetWidth - newWidth));
        newTop = Math.max(0, Math.min(newTop, canvas.offsetHeight - newHeight));
        
        // Apply the new dimensions and position
        this.selectedTextElement.style.width = newWidth + 'px';
        this.selectedTextElement.style.height = newHeight + 'px';
        this.selectedTextElement.style.left = newLeft + 'px';
        this.selectedTextElement.style.top = newTop + 'px';
        this.selectedTextElement.style.transform = 'none';
        
        // Show measurement display
        this.showMeasurementDisplay(newWidth, newHeight, newLeft, newTop);
        this.showAlignmentGuides(newLeft, newTop, newWidth, newHeight);
    }

    stopResize() {
        if (this.selectedTextElement) {
            this.selectedTextElement.classList.remove('resizing');
        }
        this.isResizing = false;
        this.resizeHandle = null;
        this.hideAlignmentGuides();
        this.hideMeasurementDisplay();
    }

    selectTextElement(element) {
        // Deselect previous
        document.querySelectorAll('.text-overlay').forEach(el => {
            el.classList.remove('active');
        });
        
        // Select new
        element.classList.add('active');
        this.selectedTextElement = element;
        
        // Update style panel with current values
        this.updateStylePanel(element);
    }

    deselectTextElement() {
        document.querySelectorAll('.text-overlay').forEach(el => {
            el.classList.remove('active');
        });
        this.selectedTextElement = null;
    }

    updateStylePanel(element) {
        const textContent = element.querySelector('.text-content');
        const computedStyle = window.getComputedStyle(textContent);
        
        // Update font size slider
        const fontSize = parseInt(computedStyle.fontSize);
        document.getElementById('fontSize').value = fontSize;
        document.getElementById('fontSizeValue').textContent = fontSize + 'px';
        
        // Update color picker
        document.getElementById('textColor').value = this.rgbToHex(computedStyle.color);
        
        // Update alignment
        document.querySelectorAll('.align-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.align === computedStyle.textAlign) {
                btn.classList.add('active');
            }
        });
    }

    updateTextStyle(property, value) {
        if (!this.selectedTextElement) return;
        
        const textContent = this.selectedTextElement.querySelector('.text-content');
        
        switch (property) {
            case 'fontFamily':
                textContent.className = textContent.className.replace(/font-\w+/g, '');
                textContent.classList.add(`font-${value}`);
                break;
            case 'fontSize':
                textContent.style.fontSize = value;
                break;
            case 'color':
                textContent.style.color = value;
                break;
            case 'textAlign':
                textContent.style.textAlign = value;
                break;
            case 'textShadow':
                textContent.style.textShadow = value ? '2px 2px 4px rgba(0, 0, 0, 0.5)' : 'none';
                break;
        }
    }

    updatePostText(elementId, text) {
        if (elementId === 'titleOverlay') {
            this.currentPost.title = text;
        } else if (elementId === 'subtitleOverlay') {
            this.currentPost.subtitle = text;
        }
    }

    selectAllText(element) {
        const range = document.createRange();
        range.selectNodeContents(element);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
    }

    changeAspectRatio(ratio) {
        // Update active button
        document.querySelectorAll('.aspect-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.ratio === ratio) {
                btn.classList.add('active');
            }
        });
        
        // Update canvas
        const canvas = document.getElementById('canvas');
        canvas.className = 'canvas';
        
        switch (ratio) {
            case '4:5':
                canvas.classList.add('portrait');
                break;
            case '16:9':
                canvas.classList.add('landscape');
                break;
            default: // 1:1
                break;
        }
        
        this.currentPost.aspectRatio = ratio;
    }

    async generatePost() {
        const prompt = document.getElementById('promptInput').value.trim();
        if (!prompt) {
            alert('Please enter a prompt to generate your post.');
            return;
        }

        this.currentPost.prompt = prompt;
        this.showLoading('Generating your post...');

        try {
            // Simulate AI generation (replace with actual API calls)
            await this.simulateImageGeneration(prompt);
            await this.simulateTextGeneration(prompt);
            
            this.showCanvas();
            this.hideLoading();
        } catch (error) {
            console.error('Error generating post:', error);
            this.hideLoading();
            alert('Error generating post. Please try again.');
        }
    }

    async regeneratePost() {
        if (!this.currentPost.prompt) {
            alert('No prompt available. Please generate a post first.');
            return;
        }

        this.showLoading('Regenerating your post...');

        try {
            await this.simulateImageGeneration(this.currentPost.prompt);
            await this.simulateTextGeneration(this.currentPost.prompt);
            this.hideLoading();
        } catch (error) {
            console.error('Error regenerating post:', error);
            this.hideLoading();
            alert('Error regenerating post. Please try again.');
        }
    }

    async regenerateImage() {
        if (!this.currentPost.prompt) {
            alert('No prompt available. Please generate a post first.');
            return;
        }

        this.showLoading('Regenerating image...');

        try {
            const response = await fetch('/api/regenerate-image', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    prompt: this.currentPost.prompt,
                    aspectRatio: this.currentPost.aspectRatio
                })
            });

            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || 'Failed to regenerate image');
            }

            const img = document.getElementById('backgroundImage');
            img.src = data.imageUrl;
            this.currentPost.image = data.imageUrl;
            
            this.hideLoading();
        } catch (error) {
            console.error('Error regenerating image:', error);
            this.hideLoading();
            alert('Error regenerating image. Please try again.');
        }
    }

    async simulateImageGeneration(prompt) {
        try {
            const response = await fetch('/api/generate-image', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    prompt: prompt,
                    aspectRatio: this.currentPost.aspectRatio
                })
            });

            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || 'Failed to generate image');
            }

            const img = document.getElementById('backgroundImage');
            img.src = data.imageUrl;
            this.currentPost.image = data.imageUrl;
            
        } catch (error) {
            console.error('Error generating image:', error);
            // Fallback to placeholder if API fails
            const imageUrl = `https://picsum.photos/800/800?random=${Date.now()}`;
            const img = document.getElementById('backgroundImage');
            img.src = imageUrl;
            this.currentPost.image = imageUrl;
            throw error;
        }
    }

    async simulateTextGeneration(prompt) {
        try {
            const response = await fetch('/api/generate-text', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ prompt: prompt })
            });

            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || 'Failed to generate text');
            }

            // Update text overlays
            document.getElementById('titleText').textContent = data.title;
            document.getElementById('subtitleText').textContent = data.subtitle;
            
            // Update caption and hashtags
            document.getElementById('captionText').value = data.caption;
            this.displayHashtags(data.hashtags);
            
            // Update current post
            this.currentPost.title = data.title;
            this.currentPost.subtitle = data.subtitle;
            this.currentPost.caption = data.caption;
            this.currentPost.hashtags = data.hashtags;
            
        } catch (error) {
            console.error('Error generating text:', error);
            // Fallback to mock content if API fails
            const mockContent = this.generateMockContent(prompt);
            
            document.getElementById('titleText').textContent = mockContent.title;
            document.getElementById('subtitleText').textContent = mockContent.subtitle;
            document.getElementById('captionText').value = mockContent.caption;
            this.displayHashtags(mockContent.hashtags);
            
            this.currentPost.title = mockContent.title;
            this.currentPost.subtitle = mockContent.subtitle;
            this.currentPost.caption = mockContent.caption;
            this.currentPost.hashtags = mockContent.hashtags;
            
            throw error;
        }
    }

    generateMockContent(prompt) {
        // Simple mock content generation based on keywords
        const words = prompt.toLowerCase().split(' ');
        
        let title = 'Inspiration';
        let subtitle = 'Find your moment';
        let caption = 'Embrace the beauty of everyday moments. ✨';
        let hashtags = ['#inspiration', '#motivation', '#lifestyle', '#mindfulness', '#beauty'];

        // Customize based on keywords
        if (words.includes('forest') || words.includes('nature')) {
            title = 'Into the Wild';
            subtitle = 'Nature calls';
            caption = 'Lost in the beauty of nature. Sometimes you need to disconnect to reconnect. 🌲';
            hashtags = ['#nature', '#forest', '#wilderness', '#outdoors', '#hiking', '#peaceful', '#naturephotography', '#trees', '#adventure', '#mindfulness'];
        } else if (words.includes('quote') || words.includes('peaceful')) {
            title = 'Find Peace';
            subtitle = 'Within yourself';
            caption = 'In the quiet moments, we find our strength. Take time to breathe and just be. 🧘‍♀️';
            hashtags = ['#peace', '#mindfulness', '#meditation', '#quotes', '#innerpeace', '#wellness', '#selfcare', '#tranquility', '#zen', '#breathe'];
        } else if (words.includes('sunset') || words.includes('golden')) {
            title = 'Golden Hour';
            subtitle = 'Magic happens';
            caption = 'Chasing sunsets and dreams. Every ending is a new beginning. 🌅';
            hashtags = ['#sunset', '#goldenhour', '#photography', '#sky', '#beautiful', '#nature', '#evening', '#peaceful', '#magical', '#dreams'];
        }

        return { title, subtitle, caption, hashtags };
    }

    displayHashtags(hashtags) {
        const container = document.getElementById('hashtagsContainer');
        container.innerHTML = '';
        
        hashtags.forEach(tag => {
            const span = document.createElement('span');
            span.className = 'hashtag';
            span.textContent = tag;
            container.appendChild(span);
        });
    }

    handleImageUpload(file) {
        if (!file || !file.type.startsWith('image/')) {
            alert('Please select a valid image file.');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const img = document.getElementById('backgroundImage');
            img.src = e.target.result;
            this.currentPost.image = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    showCanvas() {
        document.getElementById('promptSection').style.display = 'none';
        document.getElementById('canvasSection').style.display = 'grid';
    }

    showLoading(text) {
        document.getElementById('loadingText').textContent = text;
        document.getElementById('loadingOverlay').classList.add('active');
    }

    hideLoading() {
        document.getElementById('loadingOverlay').classList.remove('active');
    }

    showExportModal() {
        document.getElementById('exportModal').classList.add('active');
        this.generateExportPreview();
    }

    hideExportModal() {
        document.getElementById('exportModal').classList.remove('active');
    }

    generateExportPreview() {
        const preview = document.getElementById('exportPreview');
        preview.innerHTML = `
            <div style="text-align: center; padding: 1rem;">
                <p><strong>Caption:</strong></p>
                <p style="font-style: italic; margin: 0.5rem 0;">${this.currentPost.caption}</p>
                <p><strong>Hashtags:</strong></p>
                <p style="color: #667eea; margin: 0.5rem 0;">${this.currentPost.hashtags.join(' ')}</p>
            </div>
        `;
    }

    async exportAsImage(format) {
        try {
            const canvas = await this.createExportCanvas();
            const link = document.createElement('a');
            link.download = `windsurf-post.${format}`;
            link.href = canvas.toDataURL(`image/${format}`, 0.9);
            link.click();
            
            this.hideExportModal();
        } catch (error) {
            console.error('Error exporting image:', error);
            alert('Error exporting image. Please try again.');
        }
    }

    async createExportCanvas() {
        const sourceCanvas = document.getElementById('canvas');
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Set canvas dimensions based on aspect ratio
        const aspectRatio = this.currentPost.aspectRatio;
        switch (aspectRatio) {
            case '4:5':
                canvas.width = 1080;
                canvas.height = 1350;
                break;
            case '16:9':
                canvas.width = 1080;
                canvas.height = 608;
                break;
            default: // 1:1
                canvas.width = 1080;
                canvas.height = 1080;
                break;
        }
        
        // Draw background image
        const img = document.getElementById('backgroundImage');
        if (img.src) {
            await new Promise((resolve) => {
                const tempImg = new Image();
                tempImg.onload = () => {
                    ctx.drawImage(tempImg, 0, 0, canvas.width, canvas.height);
                    resolve();
                };
                tempImg.src = img.src;
            });
        }
        
        // Draw text overlays
        this.drawTextOnCanvas(ctx, canvas.width, canvas.height);
        
        return canvas;
    }

    drawTextOnCanvas(ctx, canvasWidth, canvasHeight) {
        const sourceCanvas = document.getElementById('canvas');
        const scaleX = canvasWidth / sourceCanvas.offsetWidth;
        const scaleY = canvasHeight / sourceCanvas.offsetHeight;
        
        // Draw title
        const titleOverlay = document.getElementById('titleOverlay');
        const titleText = document.getElementById('titleText');
        this.drawTextElement(ctx, titleOverlay, titleText, scaleX, scaleY);
        
        // Draw subtitle
        const subtitleOverlay = document.getElementById('subtitleOverlay');
        const subtitleText = document.getElementById('subtitleText');
        this.drawTextElement(ctx, subtitleOverlay, subtitleText, scaleX, scaleY);
    }

    drawTextElement(ctx, overlay, textElement, scaleX, scaleY) {
        const rect = overlay.getBoundingClientRect();
        const canvasRect = document.getElementById('canvas').getBoundingClientRect();
        
        const x = (rect.left - canvasRect.left) * scaleX;
        const y = (rect.top - canvasRect.top) * scaleY;
        
        const style = window.getComputedStyle(textElement);
        const fontSize = parseInt(style.fontSize) * Math.min(scaleX, scaleY);
        
        ctx.font = `${fontSize}px ${style.fontFamily}`;
        ctx.fillStyle = style.color;
        ctx.textAlign = style.textAlign || 'left';
        
        // Add text shadow
        if (style.textShadow && style.textShadow !== 'none') {
            ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
            ctx.shadowBlur = 4 * Math.min(scaleX, scaleY);
            ctx.shadowOffsetX = 2 * scaleX;
            ctx.shadowOffsetY = 2 * scaleY;
        }
        
        ctx.fillText(textElement.textContent, x, y + fontSize);
        
        // Reset shadow
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
    }

    copyCaption() {
        const caption = this.currentPost.caption;
        const hashtags = this.currentPost.hashtags.join(' ');
        const fullText = `${caption}\n\n${hashtags}`;
        
        navigator.clipboard.writeText(fullText).then(() => {
            // Show feedback
            const btn = document.getElementById('copyCaption');
            const originalText = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-check"></i> Copied!';
            btn.style.background = '#28a745';
            
            setTimeout(() => {
                btn.innerHTML = originalText;
                btn.style.background = '';
            }, 2000);
        }).catch(() => {
            alert('Failed to copy to clipboard. Please copy manually.');
        });
    }

    saveTextChanges() {
        // Auto-save functionality could be implemented here
        console.log('Text changes saved:', this.currentPost);
    }

    showAlignmentGuides(left, top, width, height) {
        const canvas = document.getElementById('canvas');
        const canvasWidth = canvas.offsetWidth;
        const canvasHeight = canvas.offsetHeight;
        
        const centerX = left + width / 2;
        const centerY = top + height / 2;
        const canvasCenterX = canvasWidth / 2;
        const canvasCenterY = canvasHeight / 2;
        
        const tolerance = 5; // Snap tolerance in pixels
        
        // Center vertical guide
        const centerVerticalGuide = document.getElementById('centerVerticalGuide');
        if (Math.abs(centerX - canvasCenterX) < tolerance) {
            centerVerticalGuide.style.left = canvasCenterX + 'px';
            centerVerticalGuide.classList.add('active');
        } else {
            centerVerticalGuide.classList.remove('active');
        }
        
        // Center horizontal guide
        const centerHorizontalGuide = document.getElementById('centerHorizontalGuide');
        if (Math.abs(centerY - canvasCenterY) < tolerance) {
            centerHorizontalGuide.style.top = canvasCenterY + 'px';
            centerHorizontalGuide.classList.add('active');
        } else {
            centerHorizontalGuide.classList.remove('active');
        }
        
        // Left alignment guide
        const leftAlignGuide = document.getElementById('leftAlignGuide');
        if (Math.abs(left) < tolerance) {
            leftAlignGuide.style.left = '0px';
            leftAlignGuide.classList.add('active');
        } else {
            leftAlignGuide.classList.remove('active');
        }
        
        // Right alignment guide
        const rightAlignGuide = document.getElementById('rightAlignGuide');
        if (Math.abs(left + width - canvasWidth) < tolerance) {
            rightAlignGuide.style.left = canvasWidth + 'px';
            rightAlignGuide.classList.add('active');
        } else {
            rightAlignGuide.classList.remove('active');
        }
        
        // Top alignment guide
        const topAlignGuide = document.getElementById('topAlignGuide');
        if (Math.abs(top) < tolerance) {
            topAlignGuide.style.top = '0px';
            topAlignGuide.classList.add('active');
        } else {
            topAlignGuide.classList.remove('active');
        }
        
        // Bottom alignment guide
        const bottomAlignGuide = document.getElementById('bottomAlignGuide');
        if (Math.abs(top + height - canvasHeight) < tolerance) {
            bottomAlignGuide.style.top = canvasHeight + 'px';
            bottomAlignGuide.classList.add('active');
        } else {
            bottomAlignGuide.classList.remove('active');
        }
    }
    
    hideAlignmentGuides() {
        const guides = document.querySelectorAll('.alignment-guide');
        guides.forEach(guide => guide.classList.remove('active'));
    }
    
    showMeasurementDisplay(width, height, left, top) {
        const measurementDisplay = document.getElementById('measurementDisplay');
        const canvas = document.getElementById('canvas');
        const canvasRect = canvas.getBoundingClientRect();
        
        // Format measurements
        const widthPx = Math.round(width);
        const heightPx = Math.round(height);
        const leftPx = Math.round(left);
        const topPx = Math.round(top);
        
        measurementDisplay.textContent = `${widthPx} × ${heightPx}px | ${leftPx}, ${topPx}`;
        
        // Position the measurement display above the element
        const displayLeft = left + width / 2;
        const displayTop = top - 30;
        
        measurementDisplay.style.left = displayLeft + 'px';
        measurementDisplay.style.top = Math.max(10, displayTop) + 'px';
        measurementDisplay.classList.add('active');
    }
    
    hideMeasurementDisplay() {
        const measurementDisplay = document.getElementById('measurementDisplay');
        measurementDisplay.classList.remove('active');
    }

    rgbToHex(rgb) {
        const result = rgb.match(/\d+/g);
        if (!result) return '#ffffff';
        
        const r = parseInt(result[0]);
        const g = parseInt(result[1]);
        const b = parseInt(result[2]);
        
        return '#' + [r, g, b].map(x => {
            const hex = x.toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        }).join('');
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new OsonaiApp();
});

// Add some demo functionality for development
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    console.log('✨ osonai AI Instagram Post Generator loaded!');
    console.log('💡 Try entering a prompt like: "A peaceful quote over a forest background"');
}
