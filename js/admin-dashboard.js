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
        const db = firebase.firestore();
        const auth = firebase.auth();

        // DOM Elements
        const sidebar = document.getElementById('sidebar');
        const mainContent = document.getElementById('main-content');
        const tawkContainer = document.getElementById('tawk-container');
        const tawkIframe = document.getElementById('tawk-iframe');
        const tawkLink = document.getElementById('tawk-link');
        const unreadCount = document.getElementById('unread-count');
        const sidebarMenu = document.getElementById('sidebar-menu');
        const backToMenu = document.getElementById('back-to-menu');
        const newOrderBtn = document.getElementById('new-order-btn');
        const orderFormContainer = document.getElementById('order-form-container');
        const cancelOrderBtn = document.getElementById('cancel-order-btn');
        const submitOrderBtn = document.getElementById('submit-order-btn');
        const basePriceEl = document.getElementById('base-price');
        const toppingsPriceEl = document.getElementById('toppings-price');
        const taxAmountEl = document.getElementById('tax-amount');
        const totalPriceEl = document.getElementById('total-price');
        const customerSearch = document.getElementById('customer-search');
        const customerSearchResults = document.getElementById('customer-search-results');
        const customerName = document.getElementById('customer-name');
        const customerPhone = document.getElementById('customer-phone');
        const customerEmail = document.getElementById('customer-email');
        const ordersTableBody = document.getElementById('orders-table-body');
        const ordersLoading = document.getElementById('orders-loading');
        const todayOrdersCount = document.getElementById('today-orders-count');
        const revenueAmount = document.getElementById('revenue-amount');
        const pendingOrdersCount = document.getElementById('pending-orders-count');
        const refreshOrdersBtn = document.getElementById('refresh-orders-btn');
        const logoutBtn = document.getElementById('logout-btn');

        // Modal elements
        const orderDetailsModal = new bootstrap.Modal(document.getElementById('orderDetailsModal'));
        const orderDetailsTitle = document.getElementById('order-details-title');
        const orderDetailsBody = document.getElementById('order-details-body');
        const printReceiptBtn = document.getElementById('print-receipt-btn');
        const updateStatusBtn = document.getElementById('update-status-btn');

        // Pricing data
        const pricing = {
            sizes: {
                '6-inch': 24.99,
                '8-inch': 35.99,
                '10-inch': 49.99,
                '12-inch': 64.99,
                'quarter-sheet': 29.99,
                'half-sheet': 49.99
            },
            toppings: 2.00,
            taxRate: 0.08
        };

        // State
        let unreadMessages = 0;
        let tawkLoaded = false;
        let chatOpen = false;
        let currentOrder = {
            customerId: null,
            size: '',
            toppings: [],
            specialRequests: ''
        };
        let selectedCustomer = null;
        let currentOrderDetails = null;

        // Initialize the app when DOM is loaded
        document.addEventListener('DOMContentLoaded', function() {
            initFirebaseAuth();
            setupEventListeners();
            loadOrders();
            calculateDashboardStats();
        });

        function initFirebaseAuth() {
            auth.onAuthStateChanged(user => {
                if (!user) {
                    // Redirect to login page if not authenticated
                    window.location.href = 'login.html';
                }
            });
        }

        function setupEventListeners() {
            // Tawk.to chat
            tawkLink.addEventListener('click', function(e) {
                e.preventDefault();
                toggleChat();
            });
            
            backToMenu.addEventListener('click', function() {
                toggleChat();
            });

            // Order form
            newOrderBtn.addEventListener('click', function() {
                orderFormContainer.style.display = 'block';
                newOrderBtn.style.display = 'none';
                customerSearch.focus();
            });

            cancelOrderBtn.addEventListener('click', function() {
                orderFormContainer.style.display = 'none';
                newOrderBtn.style.display = 'block';
                resetOrderForm();
            });

            submitOrderBtn.addEventListener('click', submitOrder);

            // Customer search
            customerSearch.addEventListener('input', searchCustomers);
            customerSearch.addEventListener('focus', function() {
                if (customerSearch.value.length > 0) {
                    customerSearchResults.style.display = 'block';
                }
            });
            customerSearch.addEventListener('blur', function() {
                setTimeout(() => {
                    customerSearchResults.style.display = 'none';
                }, 200);
            });

            // Order form changes
            document.getElementById('cake-size').addEventListener('change', function() {
                currentOrder.size = this.value;
                calculatePrice();
            });

            document.querySelectorAll('input[name="toppings"]').forEach(checkbox => {
                checkbox.addEventListener('change', function() {
                    currentOrder.toppings = Array.from(document.querySelectorAll('input[name="toppings"]:checked')).map(el => el.value);
                    calculatePrice();
                });
            });

            document.getElementById('special-requests').addEventListener('input', function() {
                currentOrder.specialRequests = this.value;
            });

            // Orders table
            refreshOrdersBtn.addEventListener('click', loadOrders);

            // Logout
            logoutBtn.addEventListener('click', function(e) {
                e.preventDefault();
                auth.signOut().then(() => {
                    window.location.href = 'login.html';
                });
            });

            // Modal buttons
            printReceiptBtn.addEventListener('click', printReceipt);
            updateStatusBtn.addEventListener('click', updateOrderStatus);
        }

        function toggleChat() {
            chatOpen = !chatOpen;
            
            if (chatOpen) {
                // Expand sidebar and show chat
                sidebar.classList.add('expanded');
                mainContent.classList.add('expanded');
                tawkContainer.style.display = 'block';
                loadTawkTo();
                
                // Reset unread count when opening
                resetUnread();
            } else {
                // Collapse sidebar and hide chat
                sidebar.classList.remove('expanded');
                mainContent.classList.remove('expanded');
                tawkContainer.style.display = 'none';
            }
        }

        function loadTawkTo() {
            if (tawkLoaded) return;
            
            // Construct the iframe URL
            const iframeUrl = `https://dashboard.tawk.to/?widgetId=YOUR_WIDGET_ID&embedId=YOUR_EMBED_ID`;
            tawkIframe.src = iframeUrl;
            
            // Listen for messages from the iframe
            window.addEventListener('message', handleTawkMessages);
            
            tawkLoaded = true;
        }

        function handleTawkMessages(event) {
            if (event.origin !== "https://dashboard.tawk.to") return;
            
            const data = event.data;
            
            if (data.type === 'unreadCount') {
                unreadMessages = data.count;
                updateUnreadBadge();
                
                // Show notification if new messages arrived while closed
                if (data.count > 0 && !chatOpen) {
                    showDesktopNotification(`You have ${data.count} unread messages`);
                }
            }
        }

        function resetUnread() {
            unreadMessages = 0;
            updateUnreadBadge();
            
            // Notify iframe to reset unread count
            if (tawkIframe.contentWindow) {
                tawkIframe.contentWindow.postMessage({
                    type: 'resetUnread'
                }, "https://dashboard.tawk.to");
            }
        }

        function updateUnreadBadge() {
            if (unreadMessages > 0) {
                unreadCount.textContent = unreadMessages;
                unreadCount.style.display = 'flex';
            } else {
                unreadCount.style.display = 'none';
            }
        }

        function showDesktopNotification(message) {
            if (!("Notification" in window)) {
                return;
            }
            
            if (Notification.permission === "granted") {
                new Notification(message);
            } else if (Notification.permission !== "denied") {
                Notification.requestPermission().then(function(permission) {
                    if (permission === "granted") {
                        new Notification(message);
                    }
                });
            }
        }

        function searchCustomers() {
            const searchTerm = customerSearch.value.trim().toLowerCase();
            
            if (searchTerm.length < 2) {
                customerSearchResults.style.display = 'none';
                return;
            }
            
            customerSearchResults.innerHTML = '';
            customerSearchResults.style.display = 'block';
            
            // Search users in Firestore
            db.collection('users')
                .where('email', '>=', searchTerm)
                .where('email', '<=', searchTerm + '\uf8ff')
                .limit(10)
                .get()
                .then(querySnapshot => {
                    if (querySnapshot.empty) {
                        customerSearchResults.innerHTML = '<div class="customer-search-item">No users found</div>';
                        return;
                    }
                    
                    querySnapshot.forEach(doc => {
                        const user = doc.data();
                        const item = document.createElement('div');
                        item.className = 'customer-search-item';
                        item.innerHTML = `
                            <strong>${user.email}</strong><br>
                            <small>Role: ${user.role || 'No role specified'}</small>
                        `;
                        item.addEventListener('click', () => {
                            selectCustomer(doc.id, {
                                name: user.email.split('@')[0], // Use email prefix as name
                                email: user.email,
                                phone: '', // You might want to add phone to your users collection
                                role: user.role
                            });
                        });
                        customerSearchResults.appendChild(item);
                    });
                })
                .catch(error => {
                    console.error('Error searching users:', error);
                    customerSearchResults.innerHTML = '<div class="customer-search-item">Error loading users</div>';
                });
        }

        function selectCustomer(customerId, customer) {
            currentOrder.customerId = customerId;
            selectedCustomer = customer;
            customerSearch.value = customer.email;
            customerName.value = customer.name;
            customerEmail.value = customer.email;
            customerSearchResults.style.display = 'none';
        }

        function calculatePrice() {
            let basePrice = 0;
            let toppingsPrice = 0;
            let taxAmount = 0;
            let totalPrice = 0;
            
            // Calculate base price
            if (currentOrder.size && pricing.sizes[currentOrder.size]) {
                basePrice = pricing.sizes[currentOrder.size];
            }
            
            // Calculate toppings price
            toppingsPrice = currentOrder.toppings.length * pricing.toppings;
            
            // Calculate tax and total
            taxAmount = (basePrice + toppingsPrice) * pricing.taxRate;
            totalPrice = basePrice + toppingsPrice + taxAmount;
            
            // Update UI
            basePriceEl.textContent = `$${basePrice.toFixed(2)}`;
            toppingsPriceEl.textContent = `$${toppingsPrice.toFixed(2)}`;
            taxAmountEl.textContent = `$${taxAmount.toFixed(2)}`;
            totalPriceEl.textContent = `$${totalPrice.toFixed(2)}`;
        }

        function validateOrderForm() {
            const pickupDate = document.getElementById('pickup-date').value;
            const cakeType = document.getElementById('cake-type').value;
            const cakeSize = document.getElementById('cake-size').value;
            const flavor = document.querySelector('input[name="flavor"]:checked');
            const frosting = document.getElementById('frosting-type').value;
            
            if (!currentOrder.customerId) {
                alert('Please select a user');
                return false;
            }
            
            if (!pickupDate) {
                alert('Please select pickup date');
                return false;
            }
            
            if (!cakeType) {
                alert('Please select cake type');
                return false;
            }
            
            if (!cakeSize) {
                alert('Please select cake size');
                return false;
            }
            
            if (!flavor) {
                alert('Please select cake flavor');
                return false;
            }
            
            if (!frosting) {
                alert('Please select frosting type');
                return false;
            }
            
            return true;
        }

        function resetOrderForm() {
            customerSearch.value = '';
            customerName.value = '';
            customerEmail.value = '';
            document.getElementById('pickup-date').value = '';
            document.getElementById('cake-type').value = '';
            document.getElementById('cake-size').value = '';
            document.querySelectorAll('input[name="flavor"]').forEach(radio => radio.checked = false);
            document.getElementById('frosting-type').value = '';
            document.querySelectorAll('input[name="toppings"]').forEach(checkbox => checkbox.checked = false);
            document.getElementById('special-requests').value = '';
            
            currentOrder = {
                customerId: null,
                size: '',
                toppings: [],
                specialRequests: ''
            };
            selectedCustomer = null;
            
            basePriceEl.textContent = '$0.00';
            toppingsPriceEl.textContent = '$0.00';
            taxAmountEl.textContent = '$0.00';
            totalPriceEl.textContent = '$0.00';
        }

        function submitOrder() {
            if (!validateOrderForm()) {
                return;
            }
            
            const pickupDate = document.getElementById('pickup-date').value;
            const cakeType = document.getElementById('cake-type').value;
            const cakeSize = document.getElementById('cake-size').value;
            const flavor = document.querySelector('input[name="flavor"]:checked').value;
            const frosting = document.getElementById('frosting-type').value;
            const specialRequests = document.getElementById('special-requests').value;
            
            const basePrice = pricing.sizes[cakeSize] || 0;
            const toppingsPrice = currentOrder.toppings.length * pricing.toppings;
            const taxAmount = (basePrice + toppingsPrice) * pricing.taxRate;
            const totalPrice = basePrice + toppingsPrice + taxAmount;
            
            const orderData = {
                userId: currentOrder.customerId,
                userEmail: selectedCustomer.email,
                userRole: selectedCustomer.role,
                customerName: selectedCustomer.name,
                customerPhone: selectedCustomer.phone || '',
                items: [{
                    type: cakeType,
                    size: cakeSize,
                    flavor: flavor,
                    frosting: frosting,
                    toppings: currentOrder.toppings,
                    specialRequests: specialRequests
                }],
                basePrice: basePrice,
                toppingsPrice: toppingsPrice,
                taxAmount: taxAmount,
                totalPrice: totalPrice,
                pickupDate: new Date(pickupDate),
                status: 'pending',
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                createdBy: auth.currentUser.uid
            };
            
            // Show loading state
            submitOrderBtn.disabled = true;
            submitOrderBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Submitting...';
            
            // Save to Firestore
            db.collection('orders').add(orderData)
                .then(docRef => {
                    alert(`Order #${docRef.id} submitted successfully for ${selectedCustomer.email}!`);
                    orderFormContainer.style.display = 'none';
                    newOrderBtn.style.display = 'block';
                    resetOrderForm();
                    loadOrders();
                    calculateDashboardStats();
                })
                .catch(error => {
                    console.error('Error submitting order:', error);
                    alert('Error submitting order. Please try again.');
                })
                .finally(() => {
                    submitOrderBtn.disabled = false;
                    submitOrderBtn.innerHTML = '<i class="fas fa-check me-2"></i>Submit Order';
                });
        }

        function loadOrders() {
            ordersLoading.style.display = 'block';
            ordersTableBody.innerHTML = '';
            
            db.collection('orders')
                .orderBy('createdAt', 'desc')
                .limit(20)
                .get()
                .then(querySnapshot => {
                    if (querySnapshot.empty) {
                        ordersTableBody.innerHTML = '<tr><td colspan="7" class="text-center">No orders found</td></tr>';
                        return;
                    }
                    
                    querySnapshot.forEach(doc => {
                        const order = doc.data();
                        const pickupDate = order.pickupDate.toDate();
                        const formattedDate = pickupDate.toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                        });
                        
                        const statusBadge = getStatusBadge(order.status);
                        
                        const row = document.createElement('tr');
                        row.innerHTML = `
                            <td>#${doc.id.substring(0, 8)}</td>
                            <td>${order.userEmail || order.customerName}</td>
                            <td>${order.items[0].flavor} ${order.items[0].size}</td>
                            <td>$${order.totalPrice.toFixed(2)}</td>
                            <td>${formattedDate}</td>
                            <td>${statusBadge}</td>
                            <td>
                                <button class="btn btn-sm btn-outline-primary view-order-btn" data-id="${doc.id}">
                                    <i class="fas fa-eye"></i>
                                </button>
                                <button class="btn btn-sm btn-outline-secondary print-order-btn" data-id="${doc.id}">
                                    <i class="fas fa-print"></i>
                                </button>
                            </td>
                        `;
                        ordersTableBody.appendChild(row);
                    });
                    
                    // Add event listeners to view buttons
                    document.querySelectorAll('.view-order-btn').forEach(btn => {
                        btn.addEventListener('click', function() {
                            const orderId = this.getAttribute('data-id');
                            viewOrderDetails(orderId);
                        });
                    });
                })
                .catch(error => {
                    console.error('Error loading orders:', error);
                    ordersTableBody.innerHTML = '<tr><td colspan="7" class="text-center">Error loading orders</td></tr>';
                })
                .finally(() => {
                    ordersLoading.style.display = 'none';
                });
        }

        function getStatusBadge(status) {
            switch(status) {
                case 'pending':
                    return '<span class="badge bg-warning">Pending</span>';
                case 'preparing':
                    return '<span class="badge bg-info">Preparing</span>';
                case 'ready':
                    return '<span class="badge bg-success">Ready</span>';
                case 'picked-up':
                    return '<span class="badge bg-secondary">Picked Up</span>';
                case 'cancelled':
                    return '<span class="badge bg-danger">Cancelled</span>';
                default:
                    return '<span class="badge bg-light text-dark">Unknown</span>';
            }
        }

        function viewOrderDetails(orderId) {
            db.collection('orders').doc(orderId).get()
                .then(doc => {
                    if (!doc.exists) {
                        alert('Order not found');
                        return;
                    }
                    
                    const order = doc.data();
                    currentOrderDetails = { id: doc.id, ...order };
                    
                    const pickupDate = order.pickupDate.toDate();
                    const formattedPickupDate = pickupDate.toLocaleString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    });
                    
                    const createdDate = order.createdAt.toDate();
                    const formattedCreatedDate = createdDate.toLocaleString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    });
                    
                    // Update modal title
                    orderDetailsTitle.textContent = `Order Details #${doc.id.substring(0, 8)}`;
                    
                    // Update modal body
                    orderDetailsBody.innerHTML = `
                        <div class="row">
                            <div class="col-md-6">
                                <h6>User Information</h6>
                                <p><strong>Email:</strong> ${order.userEmail || order.customerEmail}</p>
                                <p><strong>Name:</strong> ${order.customerName}</p>
                                <p><strong>Phone:</strong> ${order.customerPhone || 'Not provided'}</p>
                                <p><strong>Role:</strong> ${order.userRole || 'Not specified'}</p>
                                
                                <h6 class="mt-4">Order Information</h6>
                                <p><strong>Order Date:</strong> ${formattedCreatedDate}</p>
                                <p><strong>Pickup Date:</strong> ${formattedPickupDate}</p>
                                <p><strong>Status:</strong> ${getStatusBadge(order.status)}</p>
                            </div>
                            <div class="col-md-6">
                                <h6>Cake Details</h6>
                                <img src="https://via.placeholder.com/300x200?text=${order.items[0].flavor}+Cake" alt="Cake Preview" class="modal-cake-preview mb-3">
                                <p><strong>Type:</strong> ${order.items[0].size} ${order.items[0].type}</p>
                                <p><strong>Flavor:</strong> ${order.items[0].flavor}</p>
                                <p><strong>Frosting:</strong> ${order.items[0].frosting}</p>
                                <p><strong>Toppings:</strong> ${order.items[0].toppings.length > 0 ? order.items[0].toppings.join(', ') : 'None'}</p>
                                <p><strong>Special Requests:</strong> ${order.items[0].specialRequests || 'None'}</p>
                            </div>
                        </div>
                        
                        <div class="order-summary mt-4">
                            <h6>Payment Summary</h6>
                            <table class="table table-bordered">
                                <tr>
                                    <th>Base Price</th>
                                    <td>$${order.basePrice.toFixed(2)}</td>
                                </tr>
                                <tr>
                                    <th>Toppings (${order.items[0].toppings.length} @ $${pricing.toppings.toFixed(2)})</th>
                                    <td>$${order.toppingsPrice.toFixed(2)}</td>
                                </tr>
                                <tr>
                                    <th>Tax (${(pricing.taxRate * 100)}%)</th>
                                    <td>$${order.taxAmount.toFixed(2)}</td>
                                </tr>
                                <tr class="table-active">
                                    <th>Total</th>
                                    <td>$${order.totalPrice.toFixed(2)}</td>
                                </tr>
                            </table>
                        </div>
                    `;
                    
                    // Update button visibility based on status
                    if (order.status === 'ready') {
                        updateStatusBtn.textContent = 'Mark as Picked Up';
                        updateStatusBtn.style.display = 'block';
                    } else if (order.status === 'pending' || order.status === 'preparing') {
                        updateStatusBtn.textContent = 'Mark as Ready';
                        updateStatusBtn.style.display = 'block';
                    } else {
                        updateStatusBtn.style.display = 'none';
                    }
                    
                    // Show modal
                    orderDetailsModal.show();
                })
                .catch(error => {
                    console.error('Error loading order details:', error);
                    alert('Error loading order details');
                });
        }

        function printReceipt() {
            // In a real app, you would generate a printable receipt
            alert('Receipt printing would be implemented here');
        }

        function updateOrderStatus() {
            if (!currentOrderDetails) return;
            
            let newStatus = '';
            if (currentOrderDetails.status === 'ready') {
                newStatus = 'picked-up';
            } else if (currentOrderDetails.status === 'pending' || currentOrderDetails.status === 'preparing') {
                newStatus = 'ready';
            }
            
            if (!newStatus) return;
            
            // Show loading state
            updateStatusBtn.disabled = true;
            updateStatusBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Updating...';
            
            db.collection('orders').doc(currentOrderDetails.id).update({
                status: newStatus
            })
            .then(() => {
                orderDetailsModal.hide();
                loadOrders();
                calculateDashboardStats();
            })
            .catch(error => {
                console.error('Error updating order status:', error);
                alert('Error updating order status');
            })
            .finally(() => {
                updateStatusBtn.disabled = false;
                updateStatusBtn.innerHTML = updateStatusBtn.textContent;
            });
        }

        function calculateDashboardStats() {
            // Today's date
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            // Get today's orders count
            db.collection('orders')
                .where('createdAt', '>=', today)
                .get()
                .then(querySnapshot => {
                    todayOrdersCount.textContent = querySnapshot.size;
                });
            
            // Get pending orders count
            db.collection('orders')
                .where('status', 'in', ['pending', 'preparing'])
                .get()
                .then(querySnapshot => {
                    pendingOrdersCount.textContent = querySnapshot.size;
                });
            
            // Get revenue (last 30 days)
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            
            db.collection('orders')
                .where('createdAt', '>=', thirtyDaysAgo)
                .get()
                .then(querySnapshot => {
                    let totalRevenue = 0;
                    querySnapshot.forEach(doc => {
                        totalRevenue += doc.data().totalPrice;
                    });
                    revenueAmount.textContent = `$${totalRevenue.toFixed(2)}`;
                });
        }

        // Initialize notification permission
        if ("Notification" in window) {
            Notification.requestPermission();
        }