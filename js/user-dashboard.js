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

        // DOM elements
        const logoutBtn = document.getElementById('logoutBtn');
        const orderModal = $('#orderModal');
        
        // Count elements
        const totalOrdersEl = document.getElementById('totalOrders');
        const processingOrdersEl = document.getElementById('processingOrders');
        const toDeliverOrdersEl = document.getElementById('toDeliverOrders');
        const deliveredOrdersEl = document.getElementById('deliveredOrders');
        
        // Order list
        const ordersList = document.getElementById('ordersList');

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
                                    <small class="text-muted">Processing</small>
                                    <small class="text-muted">Done</small>
                                    <small class="text-muted">To Deliver</small>
                                    <small class="text-muted">On the Way</small>
                                    <small class="text-muted">Delivered</small>
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