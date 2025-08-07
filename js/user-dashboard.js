        // Firebase configuration
        const firebaseConfig = {
            apiKey: "AIzaSyBD3OmV59vJXzEP_il3WYOQnnFPGvlFIbI",
            authDomain: "fernandodb-65186.firebaseapp.com",
            projectId: "fernandodb-65186",
            storageBucket: "fernandodb-65186.appspot.com",
            messagingSenderId: "849534271253",
            appId: "1:849534271253:web:d436b46feab2070f6cb31c",
            measurementId: "G-VB1FG2EHR3"
        };

        // Initialize Firebase
        firebase.initializeApp(firebaseConfig);
        const auth = firebase.auth();
        const db = firebase.firestore();

        // AI Configuration - Using Stable Diffusion API
        const API_KEY = "fa47c5c6-385a-4adc-bec3-334a76e906a0"; // Your DeepAI API key
        const ENDPOINT = "https://api.deepai.org/api/text2img"; // DeepAI text-to-image endpoint

        // DOM elements
        const logoutBtn = document.getElementById('logoutBtn');
        const orderModal = $('#orderModal');
        const sidebarToggle = document.querySelector('.sidebar-toggle');
        const sidebarOverlay = document.getElementById('sidebarOverlay');
        const sidebar = document.querySelector('.sidebar');
        
        // Count elements
        const totalOrdersEl = document.getElementById('totalOrders');
        const processingOrdersEl = document.getElementById('processingOrders');
        const toDeliverOrdersEl = document.getElementById('toDeliverOrders');
        const deliveredOrdersEl = document.getElementById('deliveredOrders');
        
        // Order list
        const ordersList = document.getElementById('ordersList');

        // AI/Gallery elements
        const chatBox = document.getElementById('chat');
        const galleryBox = document.getElementById('gallery');
        const promptInput = document.getElementById('promptInput');
        const searchInput = document.getElementById('searchInput');
        const filterButtons = document.querySelectorAll('.filter-btn');
        let galleryItems = [];  // Store gallery items
        let currentFilter = 'all';
        let currentSearch = '';

        // Mobile sidebar toggle
        sidebarToggle.addEventListener('click', function() {
            sidebar.classList.toggle('active');
            sidebarOverlay.classList.toggle('active');
        });
        
        sidebarOverlay.addEventListener('click', function() {
            sidebar.classList.remove('active');
            sidebarOverlay.classList.remove('active');
        });

        // Tab switching
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', function(e) {
                e.preventDefault();
                
                // Update active nav item
                document.querySelectorAll('.nav-item').forEach(nav => {
                    nav.classList.remove('active');
                });
                this.classList.add('active');
                
                // Hide all containers
                document.querySelectorAll('.ai-gallery-container, #orders-tab').forEach(container => {
                    container.style.display = 'none';
                });
                
                // Show selected container
                const target = this.getAttribute('data-target');
                document.getElementById(target).style.display = 'block';
                
                // Special handling for gallery
                if (target === 'gallery-tab') {
                    updateGalleryView();
                }
                
                // Close sidebar on mobile after selection
                if (window.innerWidth < 992) {
                    sidebar.classList.remove('active');
                    sidebarOverlay.classList.remove('active');
                }
            });
        });

        // Filter button click handler
        filterButtons.forEach(button => {
            button.addEventListener('click', function() {
                // Remove active class from all buttons
                filterButtons.forEach(btn => btn.classList.remove('active'));
                // Add active class to clicked button
                this.classList.add('active');
                // Set current filter
                currentFilter = this.getAttribute('data-filter');
                // Update gallery view
                updateGalleryView();
            });
        });

        // Search input handler
        searchInput.addEventListener('input', function() {
            currentSearch = this.value.toLowerCase();
            updateGalleryView();
        });

        // Check authentication state
        auth.onAuthStateChanged((user) => {
            if (!user) {
                window.location.href = 'login.html';
            } else {
                // First try to find orders by userId
                loadOrdersByUserId(user.uid).then(orders => {
                    if (orders.length === 0) {
                        // If no orders found by userId, try by email
                        loadOrdersByEmail(user.email);
                    }
                });
            }
        });

        // Load orders by user ID
        async function loadOrdersByUserId(userId) {
            try {
                const ordersRef = db.collection('orders');
                const snapshot = await ordersRef.where('userId', '==', userId).get();
                
                if (snapshot.empty) {
                    return [];
                }

                const orders = [];
                snapshot.forEach(doc => {
                    orders.push({
                        id: doc.id,
                        ...doc.data()
                    });
                });

                displayOrders(orders);
                return orders;
            } catch (error) {
                console.error("Error loading orders by user ID:", error);
                return [];
            }
        }

        // Load orders by email
        async function loadOrdersByEmail(email) {
            try {
                const ordersRef = db.collection('orders');
                const snapshot = await ordersRef.where('customerEmail', '==', email).get();
                
                if (snapshot.empty) {
                    console.log('No orders found for this email');
                    return [];
                }

                const orders = [];
                snapshot.forEach(doc => {
                    orders.push({
                        id: doc.id,
                        ...doc.data()
                    });
                });

                displayOrders(orders);
                return orders;
            } catch (error) {
                console.error("Error loading orders by email:", error);
                return [];
            }
        }

        // Display orders in the UI
        function displayOrders(orders) {
            let totalCount = 0;
            let processingCount = 0;
            let toDeliverCount = 0;
            let deliveredCount = 0;
            
            let ordersHtml = '';
            
            if (orders.length === 0) {
                // Keep the empty state message
                return;
            }
            
            orders.forEach(order => {
                const orderDate = new Date(order.createdAt?.seconds * 1000 || order.orderDate?.seconds * 1000 || Date.now());
                const formattedDate = orderDate.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
                
                const total = order.totalPrice || order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
                
                // Status counts
                totalCount++;
                if (order.status === 'processing') processingCount++;
                if (order.status === 'done' || order.status === 'to-deliver' || order.status === 'on-the-way') toDeliverCount++;
                if (order.status === 'delivered') deliveredCount++;
                
                // Status badge
                let statusBadge = '';
                let statusClass = '';
                switch(order.status) {
                    case 'processing':
                        statusBadge = 'In Process';
                        statusClass = 'status-processing';
                        break;
                    case 'done':
                        statusBadge = 'Done';
                        statusClass = 'status-done';
                        break;
                    case 'to-deliver':
                        statusBadge = 'To Deliver';
                        statusClass = 'status-to-deliver';
                        break;
                    case 'on-the-way':
                        statusBadge = 'On the Way';
                        statusClass = 'status-on-the-way';
                        break;
                    case 'delivered':
                        statusBadge = 'Delivered';
                        statusClass = 'status-delivered';
                        break;
                }
                
                // Check if order is new (placed within last 24 hours)
                const isNewOrder = (new Date() - orderDate) < (24 * 60 * 60 * 1000);
                
                ordersHtml += `
                    <div class="card order-card mb-3" data-id="${order.id}" data-status="${order.status}">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-start">
                                <div>
                                    <h5 class="mb-1">Order #${order.id.substring(0, 8)}</h5>
                                    <small class="text-muted">${formattedDate}</small>
                                </div>
                                <span class="order-status ${statusClass}">${statusBadge}</span>
                            </div>
                            
                            <div class="mt-3">
                                <div class="d-flex justify-content-between">
                                    <span>${order.items?.length || 0} item${order.items?.length !== 1 ? 's' : ''}</span>
                                    <strong>$${total.toFixed(2)}</strong>
                                </div>
                                
                                <!-- Progress bar showing order status -->
                                <div class="order-progress mt-2">
                                    <div class="progress-bar" style="width: ${getProgressWidth(order.status)}%"></div>
                                </div>
                                
                                <div class="d-flex justify-content-between text-center mt-1">
                                    <small class="${order.status === 'processing' ? 'font-weight-bold text-success' : ''}">Processing</small>
                                    <small class="${order.status === 'done' ? 'font-weight-bold text-success' : ''}">Done</small>
                                    <small class="${order.status === 'to-deliver' ? 'font-weight-bold text-success' : ''}">To Deliver</small>
                                    <small class="${order.status === 'on-the-way' ? 'font-weight-bold text-success' : ''}">On the Way</small>
                                    <small class="${order.status === 'delivered' ? 'font-weight-bold text-success' : ''}">Delivered</small>
                                </div>
                            </div>
                            
                            <button class="btn btn-sm btn-outline-primary mt-3 view-order" data-id="${order.id}">
                                <i class="fas fa-eye mr-1"></i> Track Order
                            </button>
                        </div>
                        ${isNewOrder ? '<div class="new-order-badge"><i class="fas fa-bell"></i></div>' : ''}
                    </div>
                `;
            });
            
            // Update counts
            totalOrdersEl.textContent = totalCount;
            processingOrdersEl.textContent = processingCount;
            toDeliverOrdersEl.textContent = toDeliverCount;
            deliveredOrdersEl.textContent = deliveredCount;
            
            // Update order list
            if (ordersHtml) {
                ordersList.innerHTML = ordersHtml;
            }
            
            // Add event listeners to view buttons
            document.querySelectorAll('.view-order').forEach(button => {
                button.addEventListener('click', (e) => {
                    const orderId = e.target.closest('[data-id]').getAttribute('data-id');
                    showOrderDetails(orderId);
                });
            });
        }

        // Calculate progress bar width based on order status
        function getProgressWidth(status) {
            switch(status) {
                case 'processing': return 20;
                case 'done': return 40;
                case 'to-deliver': return 60;
                case 'on-the-way': return 80;
                case 'delivered': return 100;
                default: return 0;
            }
        }

        // Show order details with tracking information
        function showOrderDetails(orderId) {
            db.collection('orders').doc(orderId).get().then((doc) => {
                if (doc.exists) {
                    const order = doc.data();
                    const orderDate = new Date(order.createdAt?.seconds * 1000 || order.orderDate?.seconds * 1000 || Date.now()).toLocaleString();
                    const total = order.totalPrice || order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
                    
                    let itemsHtml = '';
                    if (order.items) {
                        order.items.forEach(item => {
                            itemsHtml += `
                                <div class="d-flex justify-content-between align-items-center mb-3">
                                    <div>
                                        <h6>${item.name || 'Custom Cake'}</h6>
                                        <small class="text-muted">Qty: ${item.quantity} × $${item.price?.toFixed(2) || '0.00'}</small>
                                    </div>
                                    <div>$${(item.price * item.quantity).toFixed(2)}</div>
                                </div>
                            `;
                        });
                    }
                    
                    let statusBadge = '';
                    switch(order.status) {
                        case 'processing':
                            statusBadge = '<span class="order-status status-processing">In Process</span>';
                            break;
                        case 'done':
                            statusBadge = '<span class="order-status status-done">Done</span>';
                            break;
                        case 'to-deliver':
                            statusBadge = '<span class="order-status status-to-deliver">To Deliver</span>';
                            break;
                        case 'on-the-way':
                            statusBadge = '<span class="order-status status-on-the-way">On the Way</span>';
                            break;
                        case 'delivered':
                            statusBadge = '<span class="order-status status-delivered">Delivered</span>';
                            break;
                    }
                    
                    // Status timeline
                    let statusTimeline = '';
                    if (order.statusHistory) {
                        statusTimeline = `
                            <div class="mt-4">
                                <h5>Order Status Timeline</h5>
                                <div class="status-timeline">
                        `;
                        
                        // Sort status history by timestamp
                        order.statusHistory.sort((a, b) => a.timestamp.seconds - b.timestamp.seconds);
                        
                        // Define the correct order of statuses
                        const statusOrder = ['processing', 'done', 'to-deliver', 'on-the-way', 'delivered'];
                        
                        order.statusHistory.forEach((statusUpdate, index) => {
                            const statusDate = new Date(statusUpdate.timestamp.seconds * 1000).toLocaleString();
                            let statusText = '';
                            let stepClass = '';
                            
                            // Determine if this step is completed or active
                            const currentStatusIndex = statusOrder.indexOf(order.status);
                            const thisStatusIndex = statusOrder.indexOf(statusUpdate.status);
                            
                            if (thisStatusIndex < currentStatusIndex) {
                                stepClass = 'completed';
                            } else if (thisStatusIndex === currentStatusIndex) {
                                stepClass = 'active';
                            }
                            
                            switch(statusUpdate.status) {
                                case 'processing':
                                    statusText = 'Order in Process';
                                    break;
                                case 'done':
                                    statusText = 'Preparation Done';
                                    break;
                                case 'to-deliver':
                                    statusText = 'Ready to Deliver';
                                    break;
                                case 'on-the-way':
                                    statusText = 'On the Way';
                                    break;
                                case 'delivered':
                                    statusText = 'Order Delivered';
                                    break;
                            }
                            
                            statusTimeline += `
                                <div class="status-step ${stepClass}">
                                    <div class="status-date">${statusDate}</div>
                                    <div class="status-content">
                                        <strong>${statusText}</strong>
                                        ${statusUpdate.notes ? `<p class="mb-0">${statusUpdate.notes}</p>` : ''}
                                    </div>
                                </div>
                            `;
                        });
                        
                        statusTimeline += `</div></div>`;
                    }
                    
                    // Delivery information
                    let deliveryInfo = '';
                    if (order.deliveryAddress) {
                        deliveryInfo = `
                            <div class="mt-4">
                                <h5>Delivery Information</h5>
                                <p><strong>Address:</strong> ${order.deliveryAddress}</p>
                                ${order.deliveryNotes ? `<p><strong>Notes:</strong> ${order.deliveryNotes}</p>` : ''}
                            </div>
                        `;
                    }
                    
                    // Rider information (if assigned)
                    let riderInfo = '';
                    if (order.riderId) {
                        riderInfo = `
                            <div class="mt-3">
                                <h5>Delivery Rider</h5>
                                <div class="d-flex align-items-center bg-light p-3 rounded">
                                    <img src="https://ui-avatars.com/api/?name=${order.riderName || 'Rider'}&background=random" 
                                         alt="Rider" class="mr-3" width="50">
                                    <div>
                                        <strong>${order.riderName || 'Delivery Rider'}</strong><br>
                                        <small class="text-muted">Contact: ${order.riderPhone || 'Not provided'}</small>
                                    </div>
                                </div>
                            </div>
                        `;
                    }
                    
                    // Set modal title
                    document.getElementById('orderModalTitle').textContent = `Order #${orderId.substring(0, 8)} Tracking`;
                    
                    // Set modal content
                    document.getElementById('orderDetails').innerHTML = `
                        <div class="row">
                            <div class="col-md-6">
                                <p><strong>Order ID:</strong> ${orderId}</p>
                                <p><strong>Order Date:</strong> ${orderDate}</p>
                                <p><strong>Status:</strong> ${statusBadge}</p>
                            </div>
                            <div class="col-md-6 text-right">
                                <h4>Total: $${total.toFixed(2)}</h4>
                            </div>
                        </div>
                        
                        <div class="mt-4">
                            <h5>Order Items</h5>
                            ${itemsHtml || '<p>No items details available</p>'}
                        </div>
                        
                        ${deliveryInfo}
                        ${riderInfo}
                        ${statusTimeline}
                    `;
                    
                    // Show modal
                    orderModal.modal('show');
                }
            });
        }

        // Logout
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            auth.signOut().then(() => {
                window.location.href = 'login.html';
            });
        });

        // AI Cake Designer Functions
        async function sendPrompt() {
            const prompt = promptInput.value.trim();
            if (!prompt) {
                appendMsg("Please enter a cake description", true);
                return;
            }
            
            // Extract tags from the prompt
            const tags = extractTags(prompt);
            
            // Enhance the prompt to ensure realistic cake images
            const enhancedPrompt = `${prompt}, professional cake photography, high detail, realistic fondant cake, studio lighting, high resolution, food photography, no cartoon style`;
            
            promptInput.value = "";
            appendMsg(prompt, false); // user bubble
            const thinking = appendMsg("Designing your cake... 🎂", true); // AI placeholder

            try {
                // Show loading state
                thinking.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Baking your cake design...';

                // Create form data
                const formData = new FormData();
                formData.append('text', enhancedPrompt);
                
                // Make API request
                const response = await fetch(ENDPOINT, {
                    method: 'POST',
                    headers: {
                        'api-key': API_KEY
                    },
                    body: formData
                });

                if (!response.ok) {
                    throw new Error(`API request failed with status ${response.status}`);
                }

                const data = await response.json();
                
                if (!data.output_url) {
                    throw new Error("No image URL returned from API");
                }

                // Display the generated image
                thinking.innerHTML = `
                    <img src="${data.output_url}" alt="AI cake design" style="max-width:100%; border-radius:8px;">
                    <div class="mt-3">
                        <p>Here's your realistic cake design! Would you like to:</p>
                        <button class="btn btn-sm btn-outline-primary mr-2" onclick="saveDesign('${data.output_url}', '${prompt.replace(/'/g, "\\'")}', '${JSON.stringify(tags).replace(/'/g, "\\'")}')">
                            <i class="fas fa-save"></i> Save to Gallery
                        </button>
                        <button class="btn btn-sm btn-outline-success" onclick="orderThisDesign('${data.output_url}', '${prompt.replace(/'/g, "\\'")}')">
                            <i class="fas fa-shopping-cart"></i> Order This Cake
                        </button>
                    </div>
                `;
                
                // Add to gallery
                addToGallery(data.output_url, prompt, tags);
            } catch (error) {
                console.error("AI Design Error:", error);
                thinking.innerHTML = `
                    <div class="alert alert-danger">
                        <i class="fas fa-exclamation-triangle"></i> 
                        Couldn't generate design: ${error.message || "Unknown error"}
                        <p class="mt-2 mb-0 small">Please try again with a more detailed description or contact support.</p>
                    </div>
                `;
            } finally {
                chatBox.scrollTop = chatBox.scrollHeight;
            }
        }

        // Extract tags from prompt text
        function extractTags(prompt) {
            const promptLower = prompt.toLowerCase();
            const tags = [];
            
            // Check for common cake types
            if (promptLower.includes('wedding')) tags.push('wedding');
            if (promptLower.includes('birthday')) tags.push('birthday');
            if (promptLower.includes('anniversary')) tags.push('anniversary');
            
            // Check for styles
            if (promptLower.includes('cartoon')) tags.push('cartoon');
            if (promptLower.includes('minimalist') || promptLower.includes('simple')) tags.push('minimalist');
            if (promptLower.includes('floral') || promptLower.includes('flowers')) tags.push('floral');
            if (promptLower.includes('geometric')) tags.push('geometric');
            
            // Check for adult content
            if (promptLower.includes('adult') || promptLower.includes('bachelor') || 
                promptLower.includes('bachelorette') || promptLower.includes('18+')) {
                tags.push('adult');
            }
            
            // Check for dessert types
            if (promptLower.includes('chocolate') || promptLower.includes('vanilla') || 
                promptLower.includes('strawberry') || promptLower.includes('fruit')) {
                tags.push('dessert');
            }
            
            // Ensure we always have at least one tag
            if (tags.length === 0) {
                tags.push('custom');
            }
            
            return tags;
        }

        function useExample(prompt, tags) {
            promptInput.value = prompt;
            promptInput.focus();
        }

        function orderThisDesign(imageUrl, prompt) {
            alert(`This would normally redirect to the order page with:\n\nDesign: ${imageUrl}\nDescription: ${prompt}`);
            // In a real app, you would redirect to the order page with the design details
            // window.location.href = `order.html?design=${encodeURIComponent(imageUrl)}&desc=${encodeURIComponent(prompt)}`;
        }

        function appendMsg(txt, isAI) {
            const div = document.createElement('div');
            div.className = 'msg' + (isAI ? ' ai' : '');
            div.innerHTML = txt;
            chatBox.appendChild(div);
            chatBox.scrollTop = chatBox.scrollHeight;
            return div;
        }

        // Gallery Functions
        function addToGallery(imageUrl, prompt, tags = []) {
            // If tags is a string (from localStorage), parse it
            if (typeof tags === 'string') {
                try {
                    tags = JSON.parse(tags);
                } catch {
                    tags = extractTags(prompt);
                }
            }
            
            galleryItems.unshift({
                url: imageUrl,
                prompt: prompt,
                tags: tags,
                date: new Date()
            });
            
            // Update gallery view if we're currently on the gallery tab
            if (document.querySelector('.nav-item[data-target="gallery-tab"]').classList.contains('active')) {
                updateGalleryView();
            }
            
            // Save to local storage
            saveGalleryToStorage();
        }

        function updateGalleryView() {
            if (galleryItems.length === 0) {
                galleryBox.innerHTML = `
                    <div class="col-12 text-center">
                        <div class="empty-state">
                            <i class="fas fa-images"></i>
                            <h4>No designs yet</h4>
                            <p>Your generated cake designs will appear here</p>
                        </div>
                    </div>
                `;
                return;
            }
            
            let galleryHTML = '';
            let hasVisibleItems = false;
            
            galleryItems.forEach((item, index) => {
                // Apply filters
                if (currentFilter !== 'all' && !item.tags.includes(currentFilter)) {
                    return;
                }
                
                // Apply search
                if (currentSearch && 
                    !item.prompt.toLowerCase().includes(currentSearch) && 
                    !item.tags.some(tag => tag.toLowerCase().includes(currentSearch))) {
                    return;
                }
                
                hasVisibleItems = true;
                
                // Render the gallery item
                const tagsHtml = item.tags.map(tag => 
                    `<span class="tag">${tag}</span>`
                ).join('');
                
                galleryHTML += `
                    <div class="col-md-4 col-sm-6 mb-4">
                        <div class="gallery-item">
                            <img src="${item.url}" alt="${item.prompt}" class="img-fluid" 
                                 onclick="viewImage('${item.url}', '${item.prompt.replace(/'/g, "\\'")}', '${JSON.stringify(item.tags).replace(/'/g, "\\'")}')">
                            <div class="prompt-text">${item.prompt}</div>
                            <div class="tags">${tagsHtml}</div>
                            <small class="text-muted">${item.date.toLocaleDateString()}</small>
                        </div>
                    </div>
                `;
            });
            
            if (!hasVisibleItems) {
                galleryHTML = `
                    <div class="col-12 text-center">
                        <div class="empty-state">
                            <i class="fas fa-search"></i>
                            <h4>No matching designs</h4>
                            <p>Try changing your search or filter criteria</p>
                        </div>
                    </div>
                `;
            }
            
            galleryBox.innerHTML = galleryHTML;
        }

        function viewImage(src, prompt, tags) {
            // Parse tags if they're a string
            if (typeof tags === 'string') {
                try {
                    tags = JSON.parse(tags);
                } catch {
                    tags = extractTags(prompt);
                }
            }
            
            const tagsHtml = tags.map(tag => 
                `<span class="tag">${tag}</span>`
            ).join('');
            
            const modalHtml = `
                <div class="modal fade" id="imageModal" tabindex="-1">
                    <div class="modal-dialog modal-lg">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">${prompt}</h5>
                                <button type="button" class="close" data-dismiss="modal">
                                    <span>&times;</span>
                                </button>
                            </div>
                            <div class="modal-body">
                                <div class="text-center">
                                    <img src="${src}" class="img-fluid mb-3" alt="${prompt}">
                                </div>
                                <div class="tags mb-3">${tagsHtml}</div>
                                <p>${prompt}</p>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-dismiss="modal">Close</button>
                                <button type="button" class="btn btn-primary" onclick="saveDesign('${src}', '${prompt.replace(/'/g, "\\'")}', '${JSON.stringify(tags).replace(/'/g, "\\'")}')">
                                    <i class="fas fa-save"></i> Save Design
                                </button>
                                <button type="button" class="btn btn-success" onclick="orderThisDesign('${src}', '${prompt.replace(/'/g, "\\'")}')">
                                    <i class="fas fa-shopping-cart"></i> Order This Cake
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            // Inject modal into DOM
            document.body.insertAdjacentHTML('beforeend', modalHtml);
            $('#imageModal').modal('show');
            
            // Remove modal after it's closed
            $('#imageModal').on('hidden.bs.modal', function () {
                $(this).remove();
            });
        }

        function saveDesign(imageUrl, prompt, tags) {
            // Here you would typically save to your database
            // For now we'll just show a confirmation
            alert(`Design saved to your gallery!\n\nPrompt: ${prompt}`);
            $('#imageModal').modal('hide');
            
            // Add to gallery if not already there
            const exists = galleryItems.some(item => item.url === imageUrl);
            if (!exists) {
                addToGallery(imageUrl, prompt, tags);
            }
        }

        // Local storage functions for gallery
        function saveGalleryToStorage() {
            localStorage.setItem('cakeDesigns', JSON.stringify(galleryItems));
        }

        function loadGalleryFromStorage() {
            const saved = localStorage.getItem('cakeDesigns');
            if (saved) {
                galleryItems = JSON.parse(saved);
                // Convert string dates back to Date objects
                galleryItems.forEach(item => {
                    item.date = new Date(item.date);
                    // Ensure tags exist
                    if (!item.tags) {
                        item.tags = extractTags(item.prompt);
                    }
                });
            }
        }

        // Password functions
        function togglePassword(inputId) {
            const input = document.getElementById(inputId);
            const icon = input.nextElementSibling;
            if (input.type === "password") {
                input.type = "text";
                icon.classList.remove("fa-eye");
                icon.classList.add("fa-eye-slash");
            } else {
                input.type = "password";
                icon.classList.remove("fa-eye-slash");
                icon.classList.add("fa-eye");
            }
        }

        // Handle password change form submission
        document.getElementById('passwordChangeForm').addEventListener('submit', function(e) {
            e.preventDefault();
            
            const currentPassword = document.getElementById('currentPassword').value;
            const newPassword = document.getElementById('newPassword').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            const alertDiv = document.getElementById('passwordAlert');
            
            // Reset alert
            alertDiv.style.display = 'none';
            alertDiv.className = 'alert mt-3';
            
            // Validate passwords match
            if (newPassword !== confirmPassword) {
                showAlert('New passwords do not match', 'danger');
                return;
            }
            
            // Validate password length
            if (newPassword.length < 6) {
                showAlert('Password must be at least 6 characters', 'danger');
                return;
            }
            
            // Get current user
            const user = auth.currentUser;
            const credential = firebase.auth.EmailAuthProvider.credential(
                user.email, 
                currentPassword
            );
            
            // Reauthenticate user
            user.reauthenticateWithCredential(credential)
                .then(() => {
                    // Change password
                    return user.updatePassword(newPassword);
                })
                .then(() => {
                    showAlert('Password changed successfully!', 'success');
                    document.getElementById('passwordChangeForm').reset();
                })
                .catch(error => {
                    console.error('Error changing password:', error);
                    let message = 'Error changing password';
                    if (error.code === 'auth/wrong-password') {
                        message = 'Current password is incorrect';
                    } else if (error.code === 'auth/weak-password') {
                        message = 'Password is too weak';
                    }
                    showAlert(message, 'danger');
                });
        });
        
        function showAlert(message, type) {
            const alertDiv = document.getElementById('passwordAlert');
            alertDiv.textContent = message;
            alertDiv.classList.add(`alert-${type}`);
            alertDiv.style.display = 'block';
        }

        // Initialize the page
        document.addEventListener('DOMContentLoaded', function() {
            // Show orders tab by default
            document.getElementById('orders-tab').style.display = 'block';
            
            // Load gallery from local storage
            loadGalleryFromStorage();
            
            // Set up prompt input to send on Enter key (but allow Shift+Enter for new lines)
            promptInput.addEventListener('keydown', function(e) {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendPrompt();
                }
            });
            
            // Initialize mobile header if needed
            if (window.innerWidth < 992) {
                document.querySelector('.mobile-header').style.display = 'flex';
                document.querySelector('.sidebar-toggle').style.display = 'block';
            }
        });