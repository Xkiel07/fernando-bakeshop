        // Initialize Firebase
        const firebaseConfig = {
            apiKey: "AIzaSyBD3OmV59vJXzEP_il3WYOQnnFPGvlFIbI",
            authDomain: "fernandodb-65186.firebaseapp.com",
            projectId: "fernandodb-65186",
            storageBucket: "fernandodb-65186.appspot.com",
            messagingSenderId: "849534271253",
            appId: "1:849534271253:web:d436b46feab2070f6cb31c",
            measurementId: "G-VB1FG2EHR3"
        };

        firebase.initializeApp(firebaseConfig);
        const db = firebase.firestore();
        const auth = firebase.auth();
        const storage = firebase.storage();

        // DOM Elements
        const dashboardLink = document.getElementById('dashboardLink');
        const manageRidersLink = document.getElementById('manageRidersLink');
        const settingsLink = document.getElementById('settingsLink');
        const dashboardContent = document.getElementById('dashboardContent');
        const manageRidersContent = document.getElementById('manageRidersContent');
        const settingsContent = document.getElementById('settingsContent');
        const newOrderBtn = document.getElementById('new-order-btn');
        const orderFormContainer = document.getElementById('order-form-container');
        const cancelOrderBtn = document.getElementById('cancel-order-btn');
        const submitOrderBtn = document.getElementById('submit-order-btn');
        const basePriceEl = document.getElementById('base-price');
        const toppingsPriceEl = document.getElementById('toppings-price');
        const deliveryFeeEl = document.getElementById('delivery-fee');
        const taxAmountEl = document.getElementById('tax-amount');
        const totalPriceEl = document.getElementById('total-price');
        const customerSearch = document.getElementById('customer-search');
        const customerSearchResults = document.getElementById('customer-search-results');
        const customerName = document.getElementById('customer-name');
        const customerPhone = document.getElementById('customer-phone');
        const ordersTableBody = document.getElementById('orders-table-body');
        const ordersLoading = document.getElementById('orders-loading');
        const todayOrdersCount = document.getElementById('today-orders-count');
        const revenueAmount = document.getElementById('revenue-amount');
        const pendingOrdersCount = document.getElementById('pending-orders-count');
        const activeRidersCount = document.getElementById('active-riders-count');
        const refreshOrdersBtn = document.getElementById('refresh-orders-btn');
        const logoutBtn = document.getElementById('logoutBtn');
        const dateTimeLabel = document.getElementById('date-time-label');
        const orderDateTime = document.getElementById('order-date-time');
        const deliveryAddressContainer = document.getElementById('delivery-address-container');
        const riderSelectContainer = document.getElementById('rider-select-container');
        const riderSelect = document.getElementById('rider-select');
        const deliveryAddress = document.getElementById('delivery-address');
        const mapElement = document.getElementById('map');
        const userSearch = document.getElementById('userSearch');
        const userSearchResults = document.getElementById('userSearchResults');
        const selectedUserInfo = document.getElementById('selectedUserInfo');
        const selectedUserName = document.getElementById('selectedUserName');
        const selectedUserEmail = document.getElementById('selectedUserEmail');
        const selectedUserPhone = document.getElementById('selectedUserPhone');
        const selectedUserRole = document.getElementById('selectedUserRole');
        const makeRiderBtn = document.getElementById('makeRiderBtn');
        const riderSearch = document.getElementById('riderSearch');
        const ridersList = document.getElementById('ridersList');
        const ridersCount = document.getElementById('ridersCount');
        const refreshRidersBtn = document.getElementById('refresh-riders-btn');
        const confirmMakeRiderBtn = document.getElementById('confirmMakeRiderBtn');
        const confirmRemoveRiderBtn = document.getElementById('confirmRemoveRiderBtn');
        const passwordChangeForm = document.getElementById('passwordChangeForm');
        const currentPassword = document.getElementById('currentPassword');
        const newPassword = document.getElementById('newPassword');
        const confirmPassword = document.getElementById('confirmPassword');
        const passwordAlert = document.getElementById('passwordAlert');
        const sidebarToggle = document.querySelector('.sidebar-toggle');
        const sidebarOverlay = document.getElementById('sidebarOverlay');
        const sidebar = document.querySelector('.sidebar');

        // Modal elements
        const orderDetailsModal = new bootstrap.Modal(document.getElementById('orderDetailsModal'));
        const orderDetailsTitle = document.getElementById('order-details-title');
        const orderDetailsBody = document.getElementById('order-details-body');
        const printReceiptBtn = document.getElementById('print-receipt-btn');
        const updateStatusBtn = document.getElementById('update-status-btn');
        const assignRiderBtn = document.getElementById('assign-rider-btn');
        const makeRiderModal = new bootstrap.Modal(document.getElementById('makeRiderModal'));
        const removeRiderModal = new bootstrap.Modal(document.getElementById('removeRiderModal'));
        const assignRiderModal = new bootstrap.Modal(document.getElementById('assignRiderModal'));

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
            deliveryFee: 5.00,
            taxRate: 0.08
        };

        // State
        let currentOrder = {
            size: '',
            toppings: [],
            specialRequests: '',
            deliveryMethod: 'pickup',
            riderId: '',
            riderName: '',
            riderPhone: '',
            riderVehicle: ''
        };
        let currentOrderDetails = null;
        let ridersListData = [];
        let map;
        let autocomplete;
        let currentSelectedUserId = null;
        let allUsers = [];
        let allRiders = [];

        // Initialize the app when DOM is loaded
        document.addEventListener('DOMContentLoaded', function() {
            initFirebaseAuth();
            setupEventListeners();
            loadRiders();
            loadOrders();
            calculateDashboardStats();
            initAutocomplete();
        });

        function initFirebaseAuth() {
            auth.onAuthStateChanged(user => {
                if (!user) {
                    window.location.href = 'login.html';
                    return;
                }
                
                // Verify admin role
                db.collection('users').doc(user.uid).get()
                    .then(doc => {
                        if (!doc.exists || doc.data().role !== 'admin') {
                            auth.signOut();
                            window.location.href = 'unauthorized.html';
                        }
                    });
            });
        }

        function initAutocomplete() {
            try {
                autocomplete = new google.maps.places.Autocomplete(
                    deliveryAddress,
                    { types: ['geocode'] }
                );
                
                autocomplete.addListener('place_changed', function() {
                    const place = autocomplete.getPlace();
                    if (!place.geometry) return;
                    
                    mapElement.style.display = 'block';
                    
                    if (!map) {
                        map = new google.maps.Map(mapElement, {
                            center: place.geometry.location,
                            zoom: 15
                        });
                    } else {
                        map.setCenter(place.geometry.location);
                    }
                    
                    new google.maps.Marker({
                        map: map,
                        position: place.geometry.location
                    });
                });
            } catch (e) {
                console.error("Error initializing autocomplete:", e);
                deliveryAddress.placeholder = "Enter delivery address (autocomplete not available)";
            }
        }

        function setupEventListeners() {
            // Navigation
            dashboardLink.addEventListener('click', function(e) {
                e.preventDefault();
                dashboardContent.style.display = 'block';
                manageRidersContent.style.display = 'none';
                settingsContent.style.display = 'none';
                dashboardLink.classList.add('active');
                manageRidersLink.classList.remove('active');
                settingsLink.classList.remove('active');
                
                // Close sidebar on mobile after selection
                if (window.innerWidth < 992) {
                    sidebar.classList.remove('active');
                    sidebarOverlay.classList.remove('active');
                    document.body.classList.remove('no-scroll');
                }
            });

            manageRidersLink.addEventListener('click', function(e) {
                e.preventDefault();
                dashboardContent.style.display = 'none';
                manageRidersContent.style.display = 'block';
                settingsContent.style.display = 'none';
                dashboardLink.classList.remove('active');
                manageRidersLink.classList.add('active');
                settingsLink.classList.remove('active');
                
                // Close sidebar on mobile after selection
                if (window.innerWidth < 992) {
                    sidebar.classList.remove('active');
                    sidebarOverlay.classList.remove('active');
                    document.body.classList.remove('no-scroll');
                }
            });

            settingsLink.addEventListener('click', function(e) {
                e.preventDefault();
                dashboardContent.style.display = 'none';
                manageRidersContent.style.display = 'none';
                settingsContent.style.display = 'block';
                dashboardLink.classList.remove('active');
                manageRidersLink.classList.remove('active');
                settingsLink.classList.add('active');
                
                // Close sidebar on mobile after selection
                if (window.innerWidth < 992) {
                    sidebar.classList.remove('active');
                    sidebarOverlay.classList.remove('active');
                    document.body.classList.remove('no-scroll');
                }
            });

            // Mobile sidebar toggle
            sidebarToggle.addEventListener('click', function() {
                sidebar.classList.toggle('active');
                sidebarOverlay.classList.toggle('active');
                document.body.classList.toggle('no-scroll');
            });
            
            sidebarOverlay.addEventListener('click', function() {
                sidebar.classList.remove('active');
                sidebarOverlay.classList.remove('active');
                document.body.classList.remove('no-scroll');
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

            document.querySelectorAll('input[name="delivery-method"]').forEach(radio => {
                radio.addEventListener('change', function() {
                    currentOrder.deliveryMethod = this.value;
                    
                    if (this.value === 'pickup') {
                        dateTimeLabel.textContent = 'Pickup Date';
                        deliveryAddressContainer.style.display = 'none';
                        riderSelectContainer.style.display = 'none';
                        mapElement.style.display = 'none';
                    } else {
                        dateTimeLabel.textContent = 'Delivery Date';
                        deliveryAddressContainer.style.display = 'block';
                        riderSelectContainer.style.display = 'block';
                    }
                    calculatePrice();
                });
            });

            riderSelect.addEventListener('change', function() {
                const selectedRiderId = this.value;
                const riderInfo = document.getElementById('selected-rider-info');
                
                if (selectedRiderId) {
                    const rider = ridersListData.find(r => r.id === selectedRiderId);
                    if (rider) {
                        document.getElementById('selected-rider-name').textContent = rider.name;
                        document.getElementById('selected-rider-phone').textContent = rider.phone;
                        document.getElementById('selected-rider-vehicle').textContent = `${rider.vehicleType} (${rider.vehiclePlate})`;
                        riderInfo.style.display = 'block';
                        
                        currentOrder.riderId = rider.riderId;
                        currentOrder.riderName = rider.name;
                        currentOrder.riderPhone = rider.phone;
                        currentOrder.riderVehicle = `${rider.vehicleType} (${rider.vehiclePlate})`;
                    }
                } else {
                    riderInfo.style.display = 'none';
                    currentOrder.riderId = '';
                    currentOrder.riderName = '';
                    currentOrder.riderPhone = '';
                    currentOrder.riderVehicle = '';
                }
            });

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

            refreshOrdersBtn.addEventListener('click', function() {
                loadOrders();
                loadRiders();
                calculateDashboardStats();
            });

            logoutBtn.addEventListener('click', function(e) {
                e.preventDefault();
                auth.signOut().then(() => {
                    window.location.href = 'login.html';
                });
            });

            printReceiptBtn.addEventListener('click', printReceipt);
            updateStatusBtn.addEventListener('click', showUpdateStatusOptions);
            assignRiderBtn.addEventListener('click', showAssignRiderOptions);

            // Rider management
            userSearch.addEventListener('input', searchUsersForRider);
            userSearch.addEventListener('focus', function() {
                if (userSearch.value.length > 0) {
                    userSearchResults.style.display = 'block';
                }
            });
            userSearch.addEventListener('blur', function() {
                setTimeout(() => {
                    userSearchResults.style.display = 'none';
                }, 200);
            });

            makeRiderBtn.addEventListener('click', function() {
                makeRiderModal.show();
            });

            riderSearch.addEventListener('input', function() {
                filterRiders(this.value.trim().toLowerCase());
            });

            refreshRidersBtn.addEventListener('click', function() {
                loadRiders();
            });

            confirmMakeRiderBtn.addEventListener('click', function() {
                makeUserRider();
            });

            confirmRemoveRiderBtn.addEventListener('click', function() {
                removeRiderStatus();
            });

            // Password change form
            passwordChangeForm.addEventListener('submit', function(e) {
                e.preventDefault();
                changePassword();
            });
        }

        function searchCustomers() {
            const searchTerm = customerSearch.value.trim().toLowerCase();
            
            if (searchTerm.length < 2) {
                customerSearchResults.style.display = 'none';
                return;
            }
            
            customerSearchResults.innerHTML = '';
            customerSearchResults.style.display = 'block';
            
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
                            <small>${user.name || 'No name specified'}</small>
                        `;
                        item.addEventListener('click', () => {
                            selectCustomer(user);
                        });
                        customerSearchResults.appendChild(item);
                    });
                })
                .catch(error => {
                    console.error('Error searching users:', error);
                    customerSearchResults.innerHTML = '<div class="customer-search-item">Error loading users</div>';
                });
        }

        function selectCustomer(user) {
            customerSearch.value = user.email;
            customerName.value = user.name || '';
            customerPhone.value = user.phone || '';
            customerSearchResults.style.display = 'none';
        }

        function searchUsersForRider() {
            const searchTerm = userSearch.value.trim().toLowerCase();
            
            if (searchTerm.length < 2) {
                userSearchResults.style.display = 'none';
                return;
            }
            
            userSearchResults.innerHTML = '';
            userSearchResults.style.display = 'block';
            
            db.collection('users')
                .where('email', '>=', searchTerm)
                .where('email', '<=', searchTerm + '\uf8ff')
                .limit(10)
                .get()
                .then(querySnapshot => {
                    if (querySnapshot.empty) {
                        userSearchResults.innerHTML = '<div class="user-search-item">No users found</div>';
                        return;
                    }
                    
                    querySnapshot.forEach(doc => {
                        const user = doc.data();
                        const item = document.createElement('div');
                        item.className = 'user-search-item';
                        item.innerHTML = `
                            <strong>${user.email}</strong><br>
                            <small>${user.name || 'No name specified'} • ${user.role || 'customer'}</small>
                        `;
                        item.addEventListener('click', () => {
                            selectUserForRider(doc.id, user);
                        });
                        userSearchResults.appendChild(item);
                    });
                })
                .catch(error => {
                    console.error('Error searching users:', error);
                    userSearchResults.innerHTML = '<div class="user-search-item">Error loading users</div>';
                });
        }

        function selectUserForRider(userId, user) {
            currentSelectedUserId = userId;
            userSearch.value = user.email;
            selectedUserName.textContent = user.name || 'Not specified';
            selectedUserEmail.textContent = user.email;
            selectedUserPhone.textContent = user.phone || 'Not specified';
            selectedUserRole.textContent = user.role || 'customer';
            
            // Only enable the button if user is not already a rider
            makeRiderBtn.disabled = user.role === 'rider';
            
            selectedUserInfo.style.display = 'block';
            userSearchResults.style.display = 'none';
        }

        function filterRiders(searchTerm) {
            const riderCards = document.querySelectorAll('.rider-card');
            let visibleCount = 0;
            
            riderCards.forEach(card => {
                const text = card.textContent.toLowerCase();
                if (text.includes(searchTerm)) {
                    card.style.display = '';
                    visibleCount++;
                } else {
                    card.style.display = 'none';
                }
            });
            
            if (visibleCount === 0 && riderCards.length > 0) {
                ridersList.innerHTML = '<div class="text-center py-4 text-muted">No riders match your search</div>';
            }
        }

        function calculatePrice() {
            let basePrice = 0;
            let toppingsPrice = 0;
            let deliveryFee = 0;
            let taxAmount = 0;
            let totalPrice = 0;
            
            if (currentOrder.size && pricing.sizes[currentOrder.size]) {
                basePrice = pricing.sizes[currentOrder.size];
            }
            
            toppingsPrice = currentOrder.toppings.length * pricing.toppings;
            
            if (currentOrder.deliveryMethod === 'rider') {
                deliveryFee = pricing.deliveryFee;
            }
            
            taxAmount = (basePrice + toppingsPrice + deliveryFee) * pricing.taxRate;
            totalPrice = basePrice + toppingsPrice + deliveryFee + taxAmount;
            
            basePriceEl.textContent = `$${basePrice.toFixed(2)}`;
            toppingsPriceEl.textContent = `$${toppingsPrice.toFixed(2)}`;
            deliveryFeeEl.textContent = `$${deliveryFee.toFixed(2)}`;
            taxAmountEl.textContent = `$${taxAmount.toFixed(2)}`;
            totalPriceEl.textContent = `$${totalPrice.toFixed(2)}`;
        }

        function validateOrderForm() {
            const orderDateTimeValue = document.getElementById('order-date-time').value;
            const deliveryAddressValue = document.getElementById('delivery-address').value;
            const cakeType = document.getElementById('cake-type').value;
            const cakeSize = document.getElementById('cake-size').value;
            const flavor = document.querySelector('input[name="flavor"]:checked');
            const frosting = document.getElementById('frosting-type').value;
            const customerNameValue = document.getElementById('customer-name').value;
            const customerPhoneValue = document.getElementById('customer-phone').value;
            
            if (!customerNameValue) {
                alert('Please enter customer name');
                return false;
            }
            
            if (!customerPhoneValue) {
                alert('Please enter customer phone number');
                return false;
            }
            
            if (!orderDateTimeValue) {
                alert('Please select a date and time');
                return false;
            }
            
            const selectedDate = new Date(orderDateTimeValue);
            const now = new Date();
            
            if (selectedDate < now) {
                alert('Please select a future date and time');
                return false;
            }
            
            if (currentOrder.deliveryMethod === 'rider') {
                if (!deliveryAddressValue) {
                    alert('Please enter delivery address');
                    return false;
                }
                
                if (!currentOrder.riderId) {
                    alert('Please select a rider for delivery');
                    return false;
                }
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
            customerPhone.value = '';
            document.getElementById('order-date-time').value = '';
            document.getElementById('delivery-address').value = '';
            document.getElementById('cake-type').value = '';
            document.getElementById('cake-size').value = '';
            document.querySelectorAll('input[name="flavor"]').forEach(radio => radio.checked = false);
            document.getElementById('frosting-type').value = '';
            document.querySelectorAll('input[name="toppings"]').forEach(checkbox => checkbox.checked = false);
            document.getElementById('special-requests').value = '';
            document.getElementById('delivery-pickup').checked = true;
            dateTimeLabel.textContent = 'Pickup Date';
            deliveryAddressContainer.style.display = 'none';
            riderSelectContainer.style.display = 'none';
            mapElement.style.display = 'none';
            document.getElementById('selected-rider-info').style.display = 'none';
            riderSelect.innerHTML = '<option value="">-- Select Rider --</option>';
            
            currentOrder = {
                size: '',
                toppings: [],
                specialRequests: '',
                deliveryMethod: 'pickup',
                riderId: '',
                riderName: '',
                riderPhone: '',
                riderVehicle: ''
            };
            
            basePriceEl.textContent = '$0.00';
            toppingsPriceEl.textContent = '$0.00';
            deliveryFeeEl.textContent = '$0.00';
            taxAmountEl.textContent = '$0.00';
            totalPriceEl.textContent = '$0.00';
        }

        function submitOrder() {
            if (!validateOrderForm()) {
                return;
            }
            
            const orderDateTimeValue = document.getElementById('order-date-time').value;
            const deliveryAddressValue = document.getElementById('delivery-address').value;
            const cakeType = document.getElementById('cake-type').value;
            const cakeSize = document.getElementById('cake-size').value;
            const flavor = document.querySelector('input[name="flavor"]:checked').value;
            const frosting = document.getElementById('frosting-type').value;
            const specialRequests = document.getElementById('special-requests').value;
            const customerNameValue = document.getElementById('customer-name').value;
            const customerPhoneValue = document.getElementById('customer-phone').value;
            const customerEmailValue = customerSearch.value;
            const deliveryMethod = currentOrder.deliveryMethod;
            
            const basePrice = pricing.sizes[cakeSize] || 0;
            const toppingsPrice = currentOrder.toppings.length * pricing.toppings;
            const deliveryFee = deliveryMethod === 'rider' ? pricing.deliveryFee : 0;
            const taxAmount = (basePrice + toppingsPrice + deliveryFee) * pricing.taxRate;
            const totalPrice = basePrice + toppingsPrice + deliveryFee + taxAmount;
            
            const dateValue = new Date(orderDateTimeValue);
            
            const orderData = {
                customerEmail: customerEmailValue,
                customerName: customerNameValue,
                customerPhone: customerPhoneValue,
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
                deliveryFee: deliveryFee,
                taxAmount: taxAmount,
                totalPrice: totalPrice,
                deliveryMethod: deliveryMethod,
                status: 'pending',
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                createdBy: auth.currentUser.uid,
                riderId: '',
                assignedAt: null,
                dispatchedAt: null,
                deliveredAt: null
            };
            
            if (deliveryMethod === 'pickup') {
                orderData.pickupDate = firebase.firestore.Timestamp.fromDate(dateValue);
            } else {
                orderData.deliveryDate = firebase.firestore.Timestamp.fromDate(dateValue);
                orderData.deliveryAddress = deliveryAddressValue;
                
                if (currentOrder.riderId) {
                    orderData.riderId = currentOrder.riderId;
                    orderData.riderName = currentOrder.riderName;
                    orderData.riderPhone = currentOrder.riderPhone;
                    orderData.riderVehicle = currentOrder.riderVehicle;
                    orderData.assignedAt = firebase.firestore.FieldValue.serverTimestamp();
                }
            }
            
            submitOrderBtn.disabled = true;
            submitOrderBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Submitting...';
            
            db.collection('orders').add(orderData)
                .then(docRef => {
                    alert(`Order #${docRef.id} submitted successfully!`);
                    orderFormContainer.style.display = 'none';
                    newOrderBtn.style.display = 'block';
                    resetOrderForm();
                    loadOrders();
                    calculateDashboardStats();
                })
                .catch(error => {
                    console.error('Error submitting order:', error);
                    alert('Error submitting order. Please try again.\n' + error.message);
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
                .limit(50)
                .get()
                .then(querySnapshot => {
                    if (querySnapshot.empty) {
                        ordersTableBody.innerHTML = '<tr><td colspan="9" class="text-center">No orders found</td></tr>';
                        return;
                    }
                    
                    querySnapshot.forEach(doc => {
                        const order = doc.data();
                        const dateField = order.deliveryMethod === 'pickup' ? order.pickupDate : order.deliveryDate;
                        const formattedDate = dateField ? dateField.toDate().toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                        }) : 'Not set';
                        
                        const statusBadge = getStatusBadge(order.status);
                        const deliveryMethodBadge = order.deliveryMethod === 'pickup' ? 
                            '<span class="badge bg-primary">Pickup</span>' : 
                            '<span class="badge bg-success">Delivery</span>';
                        
                        let riderInfo = 'Not assigned';
                        if (order.riderId && order.riderName) {
                            riderInfo = `<span class="rider-badge">${order.riderName}</span>`;
                        }
                        
                        const row = document.createElement('tr');
                        row.innerHTML = `
                            <td>#${doc.id.substring(0, 8)}</td>
                            <td>${order.customerName || order.customerEmail}</td>
                            <td>${order.items[0].flavor} ${order.items[0].size}</td>
                            <td>$${order.totalPrice.toFixed(2)}</td>
                            <td>${formattedDate}</td>
                            <td>${statusBadge}</td>
                            <td>${deliveryMethodBadge}</td>
                            <td>${riderInfo}</td>
                            <td>
                                <button class="btn btn-sm btn-outline-primary view-order-btn" data-id="${doc.id}">
                                    <i class="fas fa-eye"></i>
                                </button>
                            </td>
                        `;
                        row.querySelector('.view-order-btn').addEventListener('click', function() {
                            const orderId = this.getAttribute('data-id');
                            viewOrderDetails(orderId);
                        });
                        ordersTableBody.appendChild(row);
                    });
                })
                .catch(error => {
                    console.error('Error loading orders:', error);
                    ordersTableBody.innerHTML = '<tr><td colspan="9" class="text-center">Error loading orders</td></tr>';
                })
                .finally(() => {
                    ordersLoading.style.display = 'none';
                });
        }

        function getStatusBadge(status) {
            switch(status) {
                case 'pending':
                    return '<span class="status-badge badge-pending">Pending</span>';
                case 'preparing':
                    return '<span class="status-badge badge-preparing">Preparing</span>';
                case 'ready':
                    return '<span class="status-badge badge-ready">Ready</span>';
                case 'out-for-delivery':
                    return '<span class="status-badge badge-delivery">Out for Delivery</span>';
                case 'delivered':
                    return '<span class="status-badge badge-delivered">Delivered</span>';
                case 'cancelled':
                    return '<span class="status-badge badge-cancelled">Cancelled</span>';
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
                    
                    const dateField = order.deliveryMethod === 'pickup' ? order.pickupDate : order.deliveryDate;
                    const formattedDate = dateField ? dateField.toDate().toLocaleString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    }) : 'Not set';
                    
                    const createdDate = order.createdAt.toDate();
                    const formattedCreatedDate = createdDate.toLocaleString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    });
                    
                    orderDetailsTitle.textContent = `Order Details #${doc.id.substring(0, 8)}`;
                    
                    orderDetailsBody.innerHTML = `
                        <div class="row">
                            <div class="col-md-6">
                                <h6>Customer Information</h6>
                                <p><strong>Name:</strong> ${order.customerName}</p>
                                <p><strong>Email:</strong> ${order.customerEmail || 'Not provided'}</p>
                                <p><strong>Phone:</strong> ${order.customerPhone || 'Not provided'}</p>
                                
                                <h6 class="mt-4">Order Information</h6>
                                <p><strong>Order Date:</strong> ${formattedCreatedDate}</p>
                                <p><strong>${order.deliveryMethod === 'pickup' ? 'Pickup' : 'Delivery'} Date:</strong> ${formattedDate}</p>
                                ${order.deliveryMethod === 'rider' ? `<p><strong>Delivery Address:</strong> ${order.deliveryAddress || 'Not provided'}</p>` : ''}
                                <p><strong>Status:</strong> ${getStatusBadge(order.status)}</p>
                                <p><strong>Delivery Method:</strong> ${order.deliveryMethod === 'pickup' ? 'Customer Pickup' : 'Rider Delivery'}</p>
                                ${order.riderId ? `
                                <p><strong>Assigned Rider:</strong> ${order.riderName}</p>
                                <p><strong>Rider Phone:</strong> ${order.riderPhone}</p>
                                <p><strong>Vehicle:</strong> ${order.riderVehicle}</p>
                                ${order.assignedAt ? `<p><strong>Assigned At:</strong> ${order.assignedAt.toDate().toLocaleString()}</p>` : ''}
                                ` : ''}
                            </div>
                            <div class="col-md-6">
                                <h6>Cake Details</h6>
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
                                ${order.deliveryMethod === 'rider' ? `
                                <tr>
                                    <th>Delivery Fee</th>
                                    <td>$${order.deliveryFee.toFixed(2)}</td>
                                </tr>
                                ` : ''}
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
                    
                    updateStatusBtn.style.display = 'block';
                    
                    if (order.deliveryMethod === 'rider' && order.status !== 'delivered' && order.status !== 'cancelled' && !order.riderId) {
                        assignRiderBtn.style.display = 'block';
                    } else {
                        assignRiderBtn.style.display = 'none';
                    }
                    
                    orderDetailsModal.show();
                })
                .catch(error => {
                    console.error('Error loading order details:', error);
                    alert('Error loading order details');
                });
        }

        function printReceipt() {
            alert('Receipt printing would be implemented here');
        }

        function showUpdateStatusOptions() {
            if (!currentOrderDetails) return;
            
            const currentStatus = currentOrderDetails.status;
            let nextStatus = '';
            let statusText = '';
            
            if (currentStatus === 'pending') {
                nextStatus = 'preparing';
                statusText = 'Mark as Preparing';
            } else if (currentStatus === 'preparing') {
                if (currentOrderDetails.deliveryMethod === 'pickup') {
                    nextStatus = 'ready';
                    statusText = 'Mark as Ready for Pickup';
                } else {
                    if (currentOrderDetails.riderId) {
                        nextStatus = 'out-for-delivery';
                        statusText = 'Mark as Out for Delivery';
                    } else {
                        nextStatus = 'ready';
                        statusText = 'Mark as Ready for Delivery';
                    }
                }
            } else if (currentStatus === 'ready') {
                if (currentOrderDetails.deliveryMethod === 'pickup') {
                    nextStatus = 'picked-up';
                    statusText = 'Mark as Picked Up';
                } else {
                    nextStatus = 'delivered';
                    statusText = 'Mark as Delivered';
                }
            } else if (currentStatus === 'out-for-delivery') {
                nextStatus = 'delivered';
                statusText = 'Mark as Delivered';
            }
            
            if (confirm(`Are you sure you want to ${statusText.toLowerCase()}?`)) {
                updateOrderStatus(nextStatus);
            }
        }

        function updateOrderStatus(newStatus) {
            if (!currentOrderDetails || !newStatus) return;
            
            updateStatusBtn.disabled = true;
            updateStatusBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Updating...';
            
            const updateData = {
                status: newStatus,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            if (newStatus === 'out-for-delivery') {
                updateData.dispatchedAt = firebase.firestore.FieldValue.serverTimestamp();
            }
            
            if (newStatus === 'delivered') {
                updateData.deliveredAt = firebase.firestore.FieldValue.serverTimestamp();
            }
            
            db.collection('orders').doc(currentOrderDetails.id).update(updateData)
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
                updateStatusBtn.innerHTML = 'Update Status';
            });
        }

        function showAssignRiderOptions() {
            if (!currentOrderDetails) return;
            
            const modalContent = `
                <div class="modal-header">
                    <h5 class="modal-title">Assign Rider to Order #${currentOrderDetails.id.substring(0, 8)}</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <div class="mb-3">
                        <label for="rider-assign-select" class="form-label">Select Rider</label>
                        <select class="form-select" id="rider-assign-select">
                            <option value="">-- Select Rider --</option>
                            ${ridersListData.map(rider => 
                                `<option value="${rider.id}">${rider.name} (${rider.vehicleType} - ${rider.riderId})</option>`
                            ).join('')}
                        </select>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                    <button type="button" class="btn btn-primary" id="confirm-assign-rider-btn">Assign Rider</button>
                </div>
            `;
            
            const modalDiv = document.createElement('div');
            modalDiv.className = 'modal fade';
            modalDiv.id = 'assignRiderModal';
            modalDiv.tabIndex = '-1';
            modalDiv.innerHTML = `
                <div class="modal-dialog">
                    <div class="modal-content">
                        ${modalContent}
                    </div>
                </div>
            `;
            
            document.body.appendChild(modalDiv);
            
            const assignModal = new bootstrap.Modal(modalDiv);
            assignModal.show();
            
            document.getElementById('confirm-assign-rider-btn').addEventListener('click', function() {
                const selectedRiderId = document.getElementById('rider-assign-select').value;
                if (!selectedRiderId) {
                    alert('Please select a rider');
                    return;
                }
                
                assignRiderToOrder(selectedRiderId, assignModal);
            });
            
            modalDiv.addEventListener('hidden.bs.modal', function() {
                document.body.removeChild(modalDiv);
            });
        }

        async function assignRiderToOrder(riderId, modal) {
            const rider = ridersListData.find(r => r.id === riderId);
            if (!rider) {
                alert("Selected rider not found in local data");
                return;
            }
            
            const confirmBtn = document.getElementById('confirm-assign-rider-btn');
            confirmBtn.disabled = true;
            confirmBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Assigning...';

            try {
                // Update the order document
                await db.collection('orders').doc(currentOrderDetails.id).update({
                    riderId: rider.riderId,
                    riderName: rider.name,
                    riderPhone: rider.phone,
                    riderVehicle: `${rider.vehicleType} (${rider.vehiclePlate})`,
                    status: 'ready',
                    assignedAt: firebase.firestore.FieldValue.serverTimestamp()
                });

                modal.hide();
                orderDetailsModal.hide();
                
                // Refresh data
                loadOrders();
                
                alert(`Successfully assigned to ${rider.name}`);
            } catch (error) {
                console.error('Error during assignment:', error);
                alert(`Failed to assign rider: ${error.message}`);
            } finally {
                confirmBtn.disabled = false;
                confirmBtn.innerHTML = 'Assign Rider';
            }
        }

        function calculateDashboardStats() {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            db.collection('orders')
                .where('createdAt', '>=', today)
                .get()
                .then(querySnapshot => {
                    todayOrdersCount.textContent = querySnapshot.size;
                });
            
            db.collection('orders')
                .where('status', 'in', ['pending', 'preparing'])
                .get()
                .then(querySnapshot => {
                    pendingOrdersCount.textContent = querySnapshot.size;
                });
            
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
            
            // Count active (online) riders
            db.collection('users')
                .where('role', '==', 'rider')
                .where('riderStatus', '==', 'online')
                .get()
                .then(querySnapshot => {
                    activeRidersCount.textContent = querySnapshot.size;
                });
        }

        function loadRiders() {
            db.collection('users')
                .where('role', '==', 'rider')
                .get()
                .then(querySnapshot => {
                    ridersListData = [];
                    ridersList.innerHTML = '';
                    
                    if (querySnapshot.empty) {
                        ridersList.innerHTML = '<div class="text-center py-4 text-muted"><i class="fas fa-motorcycle fa-3x mb-3"></i><p>No riders found</p></div>';
                        ridersCount.textContent = '0 riders';
                        return;
                    }
                    
                    querySnapshot.forEach(doc => {
                        const rider = doc.data();
                        ridersListData.push({ id: doc.id, ...rider });
                        
                        const riderCard = document.createElement('div');
                        riderCard.className = 'card mb-3 rider-card';
                        riderCard.innerHTML = `
                            <div class="card-body">
                                <div class="d-flex justify-content-between">
                                    <div>
                                        <h5 class="card-title">${rider.name}</h5>
                                        <p class="card-text mb-1">
                                            <i class="fas fa-id-card"></i> ${rider.riderId || 'No ID'}
                                        </p>
                                        <p class="card-text mb-1">
                                            <i class="fas fa-envelope"></i> ${rider.email}
                                        </p>
                                        <p class="card-text mb-1">
                                            <i class="fas fa-phone"></i> ${rider.phone || 'No phone'}
                                        </p>
                                        <p class="card-text">
                                            <i class="fas fa-car"></i> ${rider.vehicleType || 'No vehicle'} (${rider.vehiclePlate || 'No plate'})
                                        </p>
                                    </div>
                                    <div class="text-end">
                                        <span class="rider-status-badge ${rider.riderStatus === 'online' ? 'rider-online' : 'rider-offline'}">
                                            ${rider.riderStatus || 'offline'}
                                        </span>
                                        <button class="btn btn-sm btn-outline-danger mt-2 remove-rider-btn" data-id="${doc.id}">
                                            <i class="fas fa-user-minus"></i> Remove
                                        </button>
                                    </div>
                                </div>
                            </div>
                        `;
                        riderCard.querySelector('.remove-rider-btn').addEventListener('click', function() {
                            currentSelectedUserId = this.getAttribute('data-id');
                            removeRiderModal.show();
                        });
                        ridersList.appendChild(riderCard);
                    });
                    
                    ridersCount.textContent = `${querySnapshot.size} ${querySnapshot.size === 1 ? 'rider' : 'riders'}`;
                })
                .catch(error => {
                    console.error('Error loading riders:', error);
                    ridersList.innerHTML = '<div class="text-center py-4 text-danger"><i class="fas fa-exclamation-triangle"></i><p>Error loading riders</p></div>';
                });
        }

        function makeUserRider() {
            const riderId = document.getElementById('riderIdInput').value.trim();
            const vehicleType = document.getElementById('vehicleTypeInput').value;
            const vehiclePlate = document.getElementById('vehiclePlateInput').value.trim();
            
            if (!riderId) {
                alert('Please enter a rider ID');
                return;
            }
            
            if (!vehiclePlate) {
                alert('Please enter a vehicle plate number');
                return;
            }
            
            confirmMakeRiderBtn.disabled = true;
            confirmMakeRiderBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Processing...';
            
            // Get the selected user's data first
            db.collection('users').doc(currentSelectedUserId).get()
                .then(doc => {
                    if (!doc.exists) {
                        throw new Error('User not found');
                    }
                    
                    const user = doc.data();
                    const updateData = {
                        role: 'rider',
                        riderId: riderId,
                        vehicleType: vehicleType,
                        vehiclePlate: vehiclePlate,
                        riderStatus: 'offline',
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                        keywords: [
                            riderId.toLowerCase(),
                            vehicleType.toLowerCase(),
                            vehiclePlate.toLowerCase(),
                            ...(user.name ? user.name.toLowerCase().split(' ') : []),
                            ...user.email.toLowerCase().split('@')[0].split('.')
                        ]
                    };
                    
                    return db.collection('users').doc(currentSelectedUserId).update(updateData);
                })
                .then(() => {
                    makeRiderModal.hide();
                    alert('User successfully made a rider!');
                    userSearch.value = '';
                    selectedUserInfo.style.display = 'none';
                    loadRiders();
                })
                .catch(error => {
                    console.error('Error making user rider:', error);
                    alert('Error making user rider: ' + error.message);
                })
                .finally(() => {
                    confirmMakeRiderBtn.disabled = false;
                    confirmMakeRiderBtn.innerHTML = 'Make Rider';
                });
        }

        function removeRiderStatus() {
            confirmRemoveRiderBtn.disabled = true;
            confirmRemoveRiderBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Processing...';
            
            const updateData = {
                role: 'customer',
                riderId: firebase.firestore.FieldValue.delete(),
                vehicleType: firebase.firestore.FieldValue.delete(),
                vehiclePlate: firebase.firestore.FieldValue.delete(),
                riderStatus: firebase.firestore.FieldValue.delete(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            db.collection('users').doc(currentSelectedUserId).update(updateData)
                .then(() => {
                    removeRiderModal.hide();
                    alert('Rider status removed successfully!');
                    loadRiders();
                })
                .catch(error => {
                    console.error('Error removing rider status:', error);
                    alert('Error removing rider status: ' + error.message);
                })
                .finally(() => {
                    confirmRemoveRiderBtn.disabled = false;
                    confirmRemoveRiderBtn.innerHTML = 'Remove Rider';
                });
        }

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

        function changePassword() {
            const currentPasswordVal = currentPassword.value;
            const newPasswordVal = newPassword.value;
            const confirmPasswordVal = confirmPassword.value;
            
            // Reset alert
            passwordAlert.style.display = 'none';
            passwordAlert.className = 'alert mt-3';
            
            // Validate passwords match
            if (newPasswordVal !== confirmPasswordVal) {
                showPasswordAlert('New passwords do not match', 'danger');
                return;
            }
            
            // Validate password length
            if (newPasswordVal.length < 6) {
                showPasswordAlert('Password must be at least 6 characters', 'danger');
                return;
            }
            
            // Get current user
            const user = auth.currentUser;
            const credential = firebase.auth.EmailAuthProvider.credential(
                user.email, 
                currentPasswordVal
            );
            
            // Reauthenticate user
            user.reauthenticateWithCredential(credential)
                .then(() => {
                    // Change password
                    return user.updatePassword(newPasswordVal);
                })
                .then(() => {
                    showPasswordAlert('Password changed successfully!', 'success');
                    passwordChangeForm.reset();
                })
                .catch(error => {
                    console.error('Error changing password:', error);
                    let message = 'Error changing password';
                    if (error.code === 'auth/wrong-password') {
                        message = 'Current password is incorrect';
                    } else if (error.code === 'auth/weak-password') {
                        message = 'Password is too weak';
                    }
                    showPasswordAlert(message, 'danger');
                });
        }

        function showPasswordAlert(message, type) {
            passwordAlert.textContent = message;
            passwordAlert.classList.add(`alert-${type}`);
            passwordAlert.style.display = 'block';
        }