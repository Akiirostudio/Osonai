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
        // New Post button
        document.getElementById('newPostBtn').addEventListener('click', () => {
            this.startNewPost();
        });

        // Upload button
        document.getElementById('uploadBtn').addEventListener('click', () => {
            console.log('🔍 Upload button clicked');
            try {
                this.showUploadModal();
                console.log('✅ showUploadModal called successfully');
            } catch (error) {
                console.error('❌ Error in showUploadModal:', error);
            }
        });

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

        // Image scaling
        document.getElementById('imageScale').addEventListener('input', (e) => {
            this.updateImageScale(e.target.value);
            document.getElementById('imageScaleValue').textContent = e.target.value + '%';
        });

        // Image positioning
        document.querySelectorAll('.position-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.position-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.updateImagePosition(e.target.dataset.position);
            });
        });

        // Image fit
        document.getElementById('imageFit').addEventListener('change', (e) => {
            this.updateImageFit(e.target.value);
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
        
        // Show and update style panel with current values
        this.showStylePanel();
        this.updateStylePanel(element);
    }

    deselectTextElement() {
        document.querySelectorAll('.text-overlay').forEach(el => {
            el.classList.remove('active');
        });
        this.selectedTextElement = null;
        // Keep style panel visible but update it for no selection
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

    startNewPost() {
        // Reset the current post state
        this.currentPost = {
            prompt: '',
            image: null,
            title: 'Your Title Here',
            subtitle: 'Your subtitle here',
            caption: '',
            hashtags: [],
            aspectRatio: '1:1'
        };
        
        // Clear the prompt input
        document.getElementById('promptInput').value = '';
        
        // Hide the canvas section and show the prompt section
        document.getElementById('canvasSection').style.display = 'none';
        document.getElementById('promptSection').style.display = 'flex';
        
        // Clear any existing canvas content
        const canvas = document.getElementById('canvas');
        const background = document.getElementById('canvasBackground');
        const textOverlays = document.getElementById('textOverlays');
        
        // Reset background
        if (background) {
            background.style.backgroundImage = '';
            background.style.backgroundColor = '#f0f0f0';
        }
        
        // Clear all text overlays
        if (textOverlays) {
            textOverlays.innerHTML = '';
        }
        
        // Reset selected text element
        this.selectedTextElement = null;
        
        // Focus on the prompt input
        document.getElementById('promptInput').focus();
        
        console.log('Started new post - application reset');
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
            // Use proxy endpoint to avoid CORS tainted canvas issues
            const proxiedUrl = `/api/proxy-image?url=${encodeURIComponent(data.imageUrl)}`;
            img.src = proxiedUrl;
            this.currentPost.image = data.imageUrl; // Store original URL for reference
            this.currentPost.proxiedImage = proxiedUrl; // Store proxied URL for export
            
            this.hideLoading();
        } catch (error) {
            console.error('Error regenerating image:', error);
            this.hideLoading();
            
            // Check if it's a content policy violation
            if (error.message && error.message.includes('content policy')) {
                alert('⚠️ Content Policy Violation\n\nYour prompt was rejected by OpenAI\'s safety system. Please try:\n• A different topic\n• More general terms\n• Avoiding potentially sensitive content');
            } else {
                alert('Error regenerating image. Please try again.');
            }
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
            // Use proxy endpoint to avoid CORS tainted canvas issues
            const proxiedUrl = `/api/proxy-image?url=${encodeURIComponent(data.imageUrl)}`;
            img.src = proxiedUrl;
            this.currentPost.image = data.imageUrl; // Store original URL for reference
            this.currentPost.proxiedImage = proxiedUrl; // Store proxied URL for export
            
        } catch (error) {
            console.error('Error generating image:', error);
            
            // Check if it's a content policy violation
            if (error.message && error.message.includes('content policy')) {
                alert('⚠️ Content Policy Violation\n\nYour prompt was rejected by OpenAI\'s safety system. Please try:\n• A different topic\n• More general terms\n• Avoiding potentially sensitive content\n\nUsing a placeholder image instead.');
            }
            
            // Fallback to placeholder if API fails
            const imageUrl = `https://picsum.photos/800/800?random=${Date.now()}`;
            const proxiedUrl = `/api/proxy-image?url=${encodeURIComponent(imageUrl)}`;
            const img = document.getElementById('backgroundImage');
            img.src = proxiedUrl;
            this.currentPost.image = imageUrl; // Store original URL for reference
            this.currentPost.proxiedImage = proxiedUrl; // Store proxied URL for export
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

        // This function is deprecated - image uploads now use createImageOverlay
        console.log('⚠️ handleImageUpload called - this should use createImageOverlay instead');
        
        const reader = new FileReader();
        reader.onload = (e) => {
            // Create overlay instead of replacing background
            this.createImageOverlay(e.target.result);
        };
        reader.readAsDataURL(file);
    }

    showCanvas() {
        document.getElementById('promptSection').style.display = 'none';
        document.getElementById('canvasSection').style.display = 'grid';
        
        // Initialize image controls
        this.initializeImageControls();
    }

    initializeImageControls() {
        // Set default image position button as active
        document.querySelector('[data-position="center"]').classList.add('active');
        
        // Set default image fit
        document.getElementById('imageFit').value = 'cover';
        
        // Set default scale
        document.getElementById('imageScale').value = 100;
        document.getElementById('imageScaleValue').textContent = '100%';
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
            console.log(`Starting ${format.toUpperCase()} export using DOM capture...`);
            
            // Debug: Check the state of all relevant elements
            this.debugExportState();
            
            // Get the canvas element that contains the complete post
            const canvasElement = document.getElementById('canvas');
            if (!canvasElement) {
                throw new Error('Canvas element not found');
            }
            
            // Use a more direct approach - capture the canvas element as it appears
            const exportCanvas = await this.captureCanvasElement(canvasElement);
            
            if (!exportCanvas) {
                throw new Error('Failed to capture canvas element');
            }
            
            // Create download link
            const link = document.createElement('a');
            link.download = `osonai-post.${format}`;
            
            // Handle different formats
            const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
            const quality = format === 'png' ? 1.0 : 0.9;
            
            // Generate data URL and download
            link.href = exportCanvas.toDataURL(mimeType, quality);
            
            if (!link.href || link.href === 'data:,') {
                throw new Error('Failed to generate image data');
            }
            
            // Trigger download
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            console.log(`${format.toUpperCase()} export successful`);
            this.hideExportModal();
            
        } catch (error) {
            console.error('Error exporting image:', error);
            alert(`Error exporting ${format.toUpperCase()}: ${error.message}\n\nTip: Try refreshing the page and generating a new image if the problem persists.`);
        }
    }

    debugExportState() {
        console.log('=== EXPORT DEBUG STATE ===');
        
        // Check canvas element
        const canvas = document.getElementById('canvas');
        console.log('Canvas element:', canvas);
        if (canvas) {
            const canvasRect = canvas.getBoundingClientRect();
            console.log('Canvas dimensions:', canvasRect.width, 'x', canvasRect.height);
            console.log('Canvas display style:', window.getComputedStyle(canvas).display);
        }
        
        // Check canvas background
        const canvasBackground = document.getElementById('canvasBackground');
        console.log('Canvas background element:', canvasBackground);
        if (canvasBackground) {
            const bgStyle = window.getComputedStyle(canvasBackground);
            console.log('Canvas background CSS background-image:', bgStyle.backgroundImage);
            console.log('Canvas background CSS background-size:', bgStyle.backgroundSize);
        }
        
        // Check background image element
        const backgroundImg = document.getElementById('backgroundImage');
        console.log('Background image element:', backgroundImg);
        if (backgroundImg) {
            console.log('Background image src:', backgroundImg.src);
            console.log('Background image complete:', backgroundImg.complete);
            console.log('Background image naturalWidth:', backgroundImg.naturalWidth);
            console.log('Background image naturalHeight:', backgroundImg.naturalHeight);
            console.log('Background image width:', backgroundImg.width);
            console.log('Background image height:', backgroundImg.height);
            console.log('Background image display style:', window.getComputedStyle(backgroundImg).display);
            console.log('Background image visibility:', window.getComputedStyle(backgroundImg).visibility);
            console.log('Background image opacity:', window.getComputedStyle(backgroundImg).opacity);
        }
        
        // Check current post state
        console.log('Current post image URL:', this.currentPost.image);
        console.log('Current post aspect ratio:', this.currentPost.aspectRatio);
        
        // Check text overlays
        const textOverlays = document.querySelectorAll('.text-overlay');
        console.log('Number of text overlays:', textOverlays.length);
        
        console.log('=== END EXPORT DEBUG ===');
    }

    async captureCanvasElement(canvasElement) {
        try {
            console.log('Capturing canvas element as it appears on screen...');
            
            // Get the current dimensions and position
            const rect = canvasElement.getBoundingClientRect();
            console.log('Canvas element dimensions:', rect.width, 'x', rect.height);
            
            // Create a new canvas with high resolution
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Set canvas dimensions based on aspect ratio for high quality export
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
            
            console.log('Export canvas dimensions:', canvas.width, 'x', canvas.height);
            
            // Fill with white background
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Calculate scaling factors
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            
            // Try to get the background image first
            const backgroundImg = document.getElementById('backgroundImage');
            if (backgroundImg && backgroundImg.complete && backgroundImg.src) {
                console.log('Drawing background image from img element...');
                try {
                    ctx.drawImage(backgroundImg, 0, 0, canvas.width, canvas.height);
                    console.log('Background image drawn successfully');
                } catch (bgError) {
                    console.warn('Failed to draw background image:', bgError);
                }
            } else {
                console.log('No background image found in img element, checking CSS...');
                
                // Check for CSS background image
                const canvasBackground = document.getElementById('canvasBackground');
                if (canvasBackground) {
                    const computedStyle = window.getComputedStyle(canvasBackground);
                    const backgroundImage = computedStyle.backgroundImage;
                    
                    if (backgroundImage && backgroundImage !== 'none') {
                        const urlMatch = backgroundImage.match(/url\(["']?([^"'\)]+)["']?\)/);
                        if (urlMatch && urlMatch[1]) {
                            console.log('Found CSS background image, loading...');
                            await new Promise((resolve) => {
                                const img = new Image();
                                img.crossOrigin = 'anonymous';
                                img.onload = () => {
                                    console.log('CSS background image loaded, drawing...');
                                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                                    resolve();
                                };
                                img.onerror = () => {
                                    console.warn('Failed to load CSS background image');
                                    resolve();
                                };
                                img.src = urlMatch[1];
                            });
                        }
                    }
                }
            }
            
            // Draw all text overlays
            const textOverlays = canvasElement.querySelectorAll('.text-overlay');
            console.log('Found', textOverlays.length, 'text overlays to draw');
            
            for (const overlay of textOverlays) {
                if (overlay.style.display === 'none') continue;
                
                const textContent = overlay.querySelector('.text-content');
                if (!textContent || !textContent.textContent.trim()) continue;
                
                // Get overlay position relative to canvas
                const overlayRect = overlay.getBoundingClientRect();
                const canvasRect = canvasElement.getBoundingClientRect();
                
                // Calculate position on export canvas
                const x = (overlayRect.left - canvasRect.left) * scaleX;
                const y = (overlayRect.top - canvasRect.top) * scaleY;
                const width = overlayRect.width * scaleX;
                const height = overlayRect.height * scaleY;
                
                // Get computed styles
                const style = window.getComputedStyle(textContent);
                const fontSize = parseFloat(style.fontSize) * Math.min(scaleX, scaleY);
                const fontFamily = style.fontFamily;
                const color = style.color;
                const textAlign = style.textAlign || 'left';
                const fontWeight = style.fontWeight;
                const fontStyle = style.fontStyle;
                
                // Set font properties
                ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;
                ctx.fillStyle = color;
                ctx.textAlign = textAlign;
                ctx.textBaseline = 'top';
                
                // Add text shadow if present
                const textShadow = style.textShadow;
                if (textShadow && textShadow !== 'none') {
                    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
                    ctx.shadowBlur = 4 * Math.min(scaleX, scaleY);
                    ctx.shadowOffsetX = 2 * scaleX;
                    ctx.shadowOffsetY = 2 * scaleY;
                }
                
                // Handle text alignment positioning
                let textX = x;
                if (textAlign === 'center') {
                    textX = x + width / 2;
                } else if (textAlign === 'right') {
                    textX = x + width;
                }
                
                // Draw the text
                const text = textContent.textContent;
                const lines = text.split('\n');
                const lineHeight = fontSize * 1.2;
                
                for (let i = 0; i < lines.length; i++) {
                    const lineY = y + (i * lineHeight);
                    ctx.fillText(lines[i], textX, lineY);
                }
                
                // Reset shadow
                ctx.shadowColor = 'transparent';
                ctx.shadowBlur = 0;
                ctx.shadowOffsetX = 0;
                ctx.shadowOffsetY = 0;
            }
            
            // Draw all image overlays
            const imageOverlays = canvasElement.querySelectorAll('.image-overlay');
            console.log('Found', imageOverlays.length, 'image overlays to draw');
            
            for (const overlay of imageOverlays) {
                if (overlay.style.display === 'none') continue;
                
                const overlayImg = overlay.querySelector('img');
                if (!overlayImg || !overlayImg.complete || !overlayImg.src) continue;
                
                // Get overlay position relative to canvas
                const overlayRect = overlay.getBoundingClientRect();
                const canvasRect = canvasElement.getBoundingClientRect();
                
                // Calculate position on export canvas
                const x = (overlayRect.left - canvasRect.left) * scaleX;
                const y = (overlayRect.top - canvasRect.top) * scaleY;
                const width = overlayRect.width * scaleX;
                const height = overlayRect.height * scaleY;
                
                try {
                    // Draw the image overlay
                    ctx.drawImage(overlayImg, x, y, width, height);
                    console.log('Image overlay drawn successfully');
                } catch (overlayError) {
                    console.warn('Failed to draw image overlay:', overlayError);
                }
            }
            
            console.log('Canvas capture completed successfully');
            return canvas;
            
        } catch (error) {
            console.error('Error capturing canvas element:', error);
            return null;
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
        
        // Draw background image with CORS handling
        const img = document.getElementById('backgroundImage');
        if (img.src) {
            await new Promise((resolve, reject) => {
                const tempImg = new Image();
                tempImg.crossOrigin = 'anonymous';
                tempImg.onload = () => {
                    try {
                        ctx.drawImage(tempImg, 0, 0, canvas.width, canvas.height);
                        resolve();
                    } catch (error) {
                        console.warn('CORS issue with image, using fallback method:', error);
                        // Fallback: draw the existing image element directly
                        try {
                            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                            resolve();
                        } catch (fallbackError) {
                            console.error('Failed to draw image:', fallbackError);
                            resolve(); // Continue without background
                        }
                    }
                };
                tempImg.onerror = () => {
                    console.warn('Failed to load image for export, continuing without background');
                    resolve(); // Continue without background
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

    async drawTextOverlaysOnCanvas(ctx, canvasWidth, canvasHeight, sourceCanvasElement) {
        // Get scaling factors
        const sourceRect = sourceCanvasElement.getBoundingClientRect();
        const scaleX = canvasWidth / sourceRect.width;
        const scaleY = canvasHeight / sourceRect.height;
        
        // Get all text overlay elements
        const textOverlays = document.querySelectorAll('.text-overlay');
        
        for (const overlay of textOverlays) {
            if (overlay.style.display === 'none') continue;
            
            // Get the text content element
            const textContent = overlay.querySelector('.text-content');
            if (!textContent || !textContent.textContent.trim()) continue;
            
            // Get overlay position relative to canvas
            const overlayRect = overlay.getBoundingClientRect();
            const canvasRect = sourceCanvasElement.getBoundingClientRect();
            
            // Calculate position on export canvas
            const x = (overlayRect.left - canvasRect.left) * scaleX;
            const y = (overlayRect.top - canvasRect.top) * scaleY;
            const width = overlayRect.width * scaleX;
            const height = overlayRect.height * scaleY;
            
            // Get computed styles
            const style = window.getComputedStyle(textContent);
            const fontSize = parseFloat(style.fontSize) * Math.min(scaleX, scaleY);
            const fontFamily = style.fontFamily;
            const color = style.color;
            const textAlign = style.textAlign || 'left';
            const fontWeight = style.fontWeight;
            const fontStyle = style.fontStyle;
            
            // Set font properties
            ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;
            ctx.fillStyle = color;
            ctx.textAlign = textAlign;
            ctx.textBaseline = 'top';
            
            // Add text shadow if present
            const textShadow = style.textShadow;
            if (textShadow && textShadow !== 'none') {
                ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
                ctx.shadowBlur = 4 * Math.min(scaleX, scaleY);
                ctx.shadowOffsetX = 2 * scaleX;
                ctx.shadowOffsetY = 2 * scaleY;
            }
            
            // Handle text alignment positioning
            let textX = x;
            if (textAlign === 'center') {
                textX = x + width / 2;
            } else if (textAlign === 'right') {
                textX = x + width;
            }
            
            // Draw the text
            const text = textContent.textContent;
            const lines = text.split('\n');
            const lineHeight = fontSize * 1.2;
            
            for (let i = 0; i < lines.length; i++) {
                const lineY = y + (i * lineHeight);
                ctx.fillText(lines[i], textX, lineY);
            }
            
            // Reset shadow
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
        }
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

    showStylePanel() {
        const sidePanel = document.getElementById('sidePanel');
        const textStylePanel = document.getElementById('textStylePanel');
        
        // Ensure side panel is visible
        sidePanel.style.display = 'block';
        textStylePanel.style.display = 'block';
    }

    updateImageScale(scale) {
        const img = document.getElementById('backgroundImage');
        if (img) {
            const scaleValue = scale / 100;
            img.style.transform = `scale(${scaleValue})`;
            img.style.transformOrigin = 'center center';
        }
    }

    updateImagePosition(position) {
        const img = document.getElementById('backgroundImage');
        if (img) {
            switch (position) {
                case 'center':
                    img.style.objectPosition = 'center center';
                    break;
                case 'top':
                    img.style.objectPosition = 'center top';
                    break;
                case 'bottom':
                    img.style.objectPosition = 'center bottom';
                    break;
                case 'left':
                    img.style.objectPosition = 'left center';
                    break;
                case 'right':
                    img.style.objectPosition = 'right center';
                    break;
            }
        }
    }

    updateImageFit(fit) {
        const img = document.getElementById('backgroundImage');
        if (img) {
            img.style.objectFit = fit;
        }
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

    // Upload Modal Functions
    showUploadModal() {
        console.log('🔍 showUploadModal called');
        const modal = document.getElementById('uploadModal');
        console.log('📋 Modal element found:', modal);
        
        if (!modal) {
            console.error('❌ Upload modal element not found!');
            alert('Upload modal not found. Please refresh the page.');
            return;
        }
        
        modal.classList.add('active');
        console.log('✅ Modal active class added');
        this.initializeUploadModal();
    }

    initializeUploadModal() {
        const modal = document.getElementById('uploadModal');
        const uploadArea = document.getElementById('uploadArea');
        const fileInput = document.getElementById('imageUpload');
        const uploadPreview = document.getElementById('uploadPreview');
        const useButton = document.getElementById('useUploadedImage');
        const cancelButton = document.getElementById('cancelUpload');
        const closeButton = document.getElementById('closeUploadModal');
        const placeholder = uploadArea.querySelector('.upload-placeholder');

        // Reset modal state
        uploadPreview.style.display = 'none';
        placeholder.style.display = 'block';
        useButton.disabled = true;
        this.uploadedImageData = null;

        // Click to upload
        uploadArea.onclick = () => fileInput.click();

        // File input change
        fileInput.onchange = (e) => this.handleFileSelect(e.target.files[0]);

        // Drag and drop
        uploadArea.ondragover = (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        };

        uploadArea.ondragleave = () => {
            uploadArea.classList.remove('dragover');
        };

        uploadArea.ondrop = (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.handleFileSelect(files[0]);
            }
        };

        // Modal controls
        useButton.onclick = () => this.useUploadedImage();
        cancelButton.onclick = () => this.hideUploadModal();
        closeButton.onclick = () => this.hideUploadModal();

        // Close on outside click
        modal.onclick = (e) => {
            if (e.target === modal) {
                this.hideUploadModal();
            }
        };
    }

    handleFileSelect(file) {
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            alert('Please select an image file (JPG, PNG, GIF)');
            return;
        }

        // Validate file size (10MB max)
        if (file.size > 10 * 1024 * 1024) {
            alert('File size must be less than 10MB');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const uploadPreview = document.getElementById('uploadPreview');
            const placeholder = document.getElementById('uploadArea').querySelector('.upload-placeholder');
            const useButton = document.getElementById('useUploadedImage');

            // Show preview
            uploadPreview.src = e.target.result;
            uploadPreview.style.display = 'block';
            placeholder.style.display = 'none';
            useButton.disabled = false;

            // Store image data
            this.uploadedImageData = e.target.result;
        };

        reader.readAsDataURL(file);
    }

    useUploadedImage() {
        if (!this.uploadedImageData) return;

        console.log('🔍 useUploadedImage called with data:', this.uploadedImageData ? 'Image data exists' : 'No image data');
        
        // Create an image overlay layer instead of replacing background
        console.log('🔍 About to call createImageOverlay...');
        this.createImageOverlay(this.uploadedImageData);
        console.log('🔍 createImageOverlay call completed');

        // Hide upload modal
        this.hideUploadModal();

        console.log('✅ User uploaded image added as overlay layer');
    }

    createImageOverlay(imageSrc) {
        console.log('🖼️ createImageOverlay called with imageSrc:', imageSrc ? 'Image source provided' : 'No image source');
        
        const canvas = document.getElementById('canvas');
        console.log('📋 Canvas element found:', canvas);
        
        if (!canvas) {
            console.error('❌ Canvas element not found! Cannot create overlay.');
            return;
        }
        
        const overlayId = 'imageOverlay' + Date.now();
        console.log('🏷️ Creating overlay with ID:', overlayId);
        
        // Create image overlay element
        const overlay = document.createElement('div');
        overlay.className = 'image-overlay';
        overlay.id = overlayId;
        console.log('📦 Overlay div created with class:', overlay.className);
        
        // Create the image element
        const img = document.createElement('img');
        img.src = imageSrc;
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'contain';
        img.style.pointerEvents = 'none'; // Prevent image from interfering with drag
        
        overlay.appendChild(img);
        
        // Set initial position and size (small overlay like text elements)
        overlay.style.position = 'absolute';
        overlay.style.left = '50px';  // Fixed pixel position from left
        overlay.style.top = '50px';   // Fixed pixel position from top
        overlay.style.width = '100px';  // Small initial size
        overlay.style.height = '100px'; // Small initial size
        overlay.style.cursor = 'move';
        overlay.style.border = '2px dashed transparent';
        overlay.style.borderRadius = '8px';
        overlay.style.transition = 'all 0.3s ease';
        overlay.style.zIndex = '200';  // Higher z-index to be above text overlays
        overlay.style.maxWidth = '300px';  // Prevent it from getting too large
        overlay.style.maxHeight = '300px'; // Prevent it from getting too large
        
        // Enable CSS resize (browser native)
        overlay.style.resize = 'both';
        overlay.style.overflow = 'hidden';
        
        // Add to canvas
        console.log('📥 Adding overlay to canvas...');
        canvas.appendChild(overlay);
        console.log('✅ Overlay added to canvas successfully');
        
        // Make it draggable and selectable
        console.log('🔄 Making overlay draggable and selectable...');
        this.makeImageOverlayDraggable(overlay);
        this.makeImageOverlaySelectable(overlay);
        
        // Add control buttons
        console.log('🎮 Adding control buttons...');
        this.addImageOverlayControls(overlay);
        
        console.log('✅ Image overlay created successfully:', overlayId);
        console.log('📋 Canvas now has', canvas.children.length, 'child elements');
        
        // Log all canvas children for debugging
        console.log('📋 Canvas children:');
        for (let i = 0; i < canvas.children.length; i++) {
            const child = canvas.children[i];
            console.log(`  ${i + 1}. ${child.tagName} - ID: ${child.id} - Class: ${child.className}`);
        }
    }

    makeImageOverlayDraggable(overlay) {
        let isDragging = false;
        let startX, startY, startLeft, startTop;
        
        overlay.addEventListener('mousedown', (e) => {
            if (e.target.classList.contains('resize-handle') || e.target.classList.contains('control-btn')) {
                return; // Don't drag when clicking resize handles or control buttons
            }
            
            isDragging = true;
            overlay.classList.add('dragging');
            
            const rect = overlay.getBoundingClientRect();
            const canvasRect = overlay.parentElement.getBoundingClientRect();
            
            startX = e.clientX;
            startY = e.clientY;
            startLeft = rect.left - canvasRect.left;
            startTop = rect.top - canvasRect.top;
            
            e.preventDefault();
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            
            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;
            
            overlay.style.left = (startLeft + deltaX) + 'px';
            overlay.style.top = (startTop + deltaY) + 'px';
        });
        
        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                overlay.classList.remove('dragging');
            }
        });
    }

    makeImageOverlaySelectable(overlay) {
        overlay.addEventListener('click', (e) => {
            if (e.target.classList.contains('resize-handle') || e.target.classList.contains('control-btn')) {
                return;
            }
            
            // Deselect other overlays
            document.querySelectorAll('.image-overlay').forEach(el => {
                el.classList.remove('active');
            });
            
            // Select this overlay
            overlay.classList.add('active');
            this.selectedImageOverlay = overlay;
        });
        
        // Show/hide controls on hover
        overlay.addEventListener('mouseenter', () => {
            overlay.style.borderColor = '#1E5B8D';
            const controls = overlay.querySelector('.overlay-controls');
            if (controls) controls.style.opacity = '1';
        });
        
        overlay.addEventListener('mouseleave', () => {
            if (!overlay.classList.contains('active')) {
                overlay.style.borderColor = 'transparent';
                const controls = overlay.querySelector('.overlay-controls');
                if (controls) controls.style.opacity = '0';
            }
        });
    }

    addImageOverlayControls(overlay) {
        const controls = document.createElement('div');
        controls.className = 'overlay-controls';
        controls.style.position = 'absolute';
        controls.style.top = '-40px';
        controls.style.right = '0';
        controls.style.display = 'flex';
        controls.style.gap = '5px';
        controls.style.opacity = '0';
        controls.style.transition = 'opacity 0.3s ease';
        
        // Delete button
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'control-btn';
        deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
        deleteBtn.title = 'Delete overlay';
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            overlay.remove();
        });
        
        // Bring to front button
        const frontBtn = document.createElement('button');
        frontBtn.className = 'control-btn';
        frontBtn.innerHTML = '<i class="fas fa-arrow-up"></i>';
        frontBtn.title = 'Bring to front';
        frontBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const currentZ = parseInt(overlay.style.zIndex) || 100;
            overlay.style.zIndex = currentZ + 10;
        });
        
        controls.appendChild(frontBtn);
        controls.appendChild(deleteBtn);
        overlay.appendChild(controls);
    }

    hideUploadModal() {
        const modal = document.getElementById('uploadModal');
        modal.classList.remove('active');
        
        // Reset file input
        document.getElementById('imageUpload').value = '';
        this.uploadedImageData = null;
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
