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
        const deliveriesTableBody = document.getElementById('deliveriesTableBody');
        const assignedCount = document.getElementById('assignedCount');
        const inTransitCount = document.getElementById('inTransitCount');
        const completedCount = document.getElementById('completedCount');
        const earningsCount = document.getElementById('earningsCount');
        const logoutBtn = document.getElementById('logoutBtn');
        const toggleStatusBtn = document.getElementById('toggleStatusBtn');
        const riderStatusIndicator = document.getElementById('riderStatusIndicator');
        const refreshDeliveriesBtn = document.getElementById('refreshDeliveriesBtn');
        const proofUpload = document.getElementById('proofUpload');
        const proofImagePreview = document.getElementById('proofImagePreview');
        const submitProofBtn = document.getElementById('submitProofBtn');

        // Current rider and state
        let currentRider = {
            id: null,
            riderId: null,
            name: "Rider",
            status: "online"
        };
        let currentOrderId = null;
        let proofFile = null;

        // Initialize the app
        document.addEventListener('DOMContentLoaded', function() {
            initFirebaseAuth();
            setupEventListeners();
        });

        function initFirebaseAuth() {
            auth.onAuthStateChanged(user => {
                if (user) {
                    loadRiderProfile(user.uid);
                } else {
                    window.location.href = 'login.html';
                }
            });
        }

        async function loadRiderProfile(userId) {
            try {
                const riderDoc = await db.collection('users').doc(userId).get();
                
                if (!riderDoc.exists) throw new Error("Rider document not found");
                if (riderDoc.data().role !== 'rider') throw new Error("User is not a rider");

                currentRider = {
                    id: userId,
                    riderId: riderDoc.data().riderId || "RIDER-001",
                    name: riderDoc.data().name || "Rider",
                    status: riderDoc.data().riderStatus || "online",
                    email: riderDoc.data().email || "",
                    phone: riderDoc.data().phone || "",
                    vehicleType: riderDoc.data().vehicleType || "",
                    vehiclePlate: riderDoc.data().vehiclePlate || ""
                };

                updateRiderStatusUI();
                loadDeliveries();
                calculateDashboardStats();
            } catch (error) {
                console.error("Error loading rider profile:", error);
                alert("Error loading rider data. Please try again.");
                setTimeout(() => window.location.href = 'login.html', 3000);
            }
        }

        // FIXED: Main function to load deliveries with proper query
        async function loadDeliveries() {
            try {
                // Query orders assigned to this rider with status 'ready' or 'out-for-delivery'
                const query = db.collection('orders')
                    .where('riderId', '==', currentRider.riderId)
                    .where('status', 'in', ['ready', 'out-for-delivery'])
                    .orderBy('assignedAt', 'desc');

                const snapshot = await query.get();
                
                if (snapshot.empty) {
                    showNoDeliveriesMessage();
                    return;
                }

                // Clear existing table rows
                deliveriesTableBody.innerHTML = '';
                
                // Counters for dashboard
                let assigned = 0;
                let inTransit = 0;

                snapshot.forEach(doc => {
                    const delivery = doc.data();
                    const status = delivery.status;
                    
                    if (status === 'ready') assigned++;
                    if (status === 'out-for-delivery') inTransit++;
                    
                    addDeliveryToTable(delivery, doc.id);
                });

                // Update counters
                assignedCount.textContent = assigned;
                inTransitCount.textContent = inTransit;

            } catch (error) {
                console.error("Error loading deliveries:", error);
                showNoDeliveriesMessage("Error loading deliveries. Please try again.");
                
                if (error.code === 'failed-precondition') {
                    // Help admin create the needed index
                    const indexUrl = `https://console.firebase.google.com/project/${firebaseConfig.projectId}/database/firestore/indexes?create_composite=ClZwcm9qZWN0cy9mZXJuYW5kb2RiLTY1MTg2L2RhdGFiYXNlcy8oZGVmYXVsdCkvY29sbGVjdGlvbkdyb3Vwcy9vcmRlcnMvaW5kZXhlcy9fEAEaDAoIcmFkZXJJZBABGgwKBnN0YXR1cxABGhAKCmFzc2lnbmVkQXQQAhoMGAAqDHRpbWVzIEFzY2VuZA`;
                    console.error("Create composite index at:", indexUrl);
                    alert("Missing Firestore index. Please contact admin to create the required index.");
                }
            }
        }

        function showNoDeliveriesMessage(message = "No active deliveries assigned to you") {
            deliveriesTableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center py-4 text-muted">
                        <i class="fas fa-box-open fa-3x mb-3"></i>
                        <p>${message}</p>
                    </td>
                </tr>`;
            assignedCount.textContent = '0';
            inTransitCount.textContent = '0';
        }

        function addDeliveryToTable(delivery, deliveryId) {
            const deliveryDate = delivery.deliveryDate?.toDate() || delivery.createdAt.toDate();
            const formattedDate = deliveryDate.toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>#${deliveryId.substring(0, 8)}</td>
                <td>${delivery.customerName || delivery.customerEmail}</td>
                <td>${delivery.items?.map(i => `${i.size} ${i.flavor}`).join(', ') || 'Cake Order'}</td>
                <td>$${(delivery.totalPrice || 0).toFixed(2)}</td>
                <td>${formattedDate}</td>
                <td>${getOrderStatusBadge(delivery.status)}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary view-order-btn" data-id="${deliveryId}">
                        <i class="fas fa-eye"></i> View
                    </button>
                </td>
            `;

            row.querySelector('.view-order-btn').addEventListener('click', () => 
                showDeliveryDetails(delivery, deliveryId));
            deliveriesTableBody.appendChild(row);
        }

        function getOrderStatusBadge(status) {
            switch(status) {
                case 'ready':
                    return '<span class="order-status-badge status-ready">Ready for Pickup</span>';
                case 'out-for-delivery':
                    return '<span class="order-status-badge status-out-for-delivery">On the Way</span>';
                case 'delivered':
                    return '<span class="order-status-badge status-delivered">Delivered</span>';
                case 'failed':
                    return '<span class="order-status-badge status-failed">Delivery Failed</span>';
                default:
                    return `<span class="badge bg-light text-dark">${status}</span>`;
            }
        }

        function showDeliveryDetails(delivery, deliveryId) {
            currentOrderId = deliveryId;
            
            const deliveryDate = delivery.deliveryDate?.toDate() || delivery.createdAt.toDate();
            const formattedDate = deliveryDate.toLocaleString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            document.getElementById('deliveryModalTitle').textContent = `Order #${deliveryId.substring(0, 8)} Details`;
            document.getElementById('deliveryDetails').innerHTML = `
                <div class="row">
                    <div class="col-md-6">
                        <h6>Customer Information</h6>
                        <p><strong>Name:</strong> ${delivery.customerName || delivery.customerEmail || 'Customer'}</p>
                        <p><strong>Phone:</strong> ${delivery.customerPhone || 'Not provided'}</p>
                        <p><strong>Delivery Date:</strong> ${formattedDate}</p>
                        <p><strong>Address:</strong> ${delivery.deliveryAddress || "Store Pickup"}</p>
                    </div>
                    <div class="col-md-6">
                        <h6>Order Details</h6>
                        <div class="card p-3">
                            ${delivery.items?.map(item => `
                                <div><strong>${item.size} ${item.type}</strong></div>
                                <div>Flavor: ${item.flavor}</div>
                                <div>Frosting: ${item.frosting}</div>
                                <div>Toppings: ${item.toppings?.join(', ') || 'None'}</div>
                                <div class="mt-2">Special Requests: ${item.specialRequests || 'None'}</div>
                            `).join('') || '<div>Cake Order</div>'}
                        </div>
                    </div>
                </div>
            `;

            setupStatusActions(delivery);
            new bootstrap.Modal(document.getElementById('deliveryModal')).show();
        }

        function setupStatusActions(delivery) {
            const statusActions = document.getElementById('statusActions');
            statusActions.innerHTML = '';
            
            const status = delivery.status || 'ready';
            
            if (status === 'ready') {
                statusActions.innerHTML = `
                    <button class="btn btn-success status-btn" id="startDeliveryBtn">
                        <i class="fas fa-motorcycle me-1"></i> Pick Up Order
                    </button>
                `;
                document.getElementById('startDeliveryBtn').addEventListener('click', () => 
                    updateDeliveryStatus(currentOrderId, 'out-for-delivery'));
            } else if (status === 'out-for-delivery') {
                statusActions.innerHTML = `
                    <button class="btn btn-primary status-btn" id="completeDeliveryBtn">
                        <i class="fas fa-check-circle me-1"></i> Mark as Delivered
                    </button>
                    <button class="btn btn-danger status-btn" id="failDeliveryBtn">
                        <i class="fas fa-times-circle me-1"></i> Delivery Failed
                    </button>
                `;
                document.getElementById('completeDeliveryBtn').addEventListener('click', showProofModal);
                document.getElementById('failDeliveryBtn').addEventListener('click', () => 
                    updateDeliveryStatus(currentOrderId, 'failed'));
            }
        }

        function updateDeliveryStatus(deliveryId, newStatus, proofUrl = null, notes = null) {
            const actionBtn = document.getElementById(`${newStatus.split('-')[0]}Btn`);
            
            if (actionBtn) {
                actionBtn.disabled = true;
                actionBtn.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Processing...`;
            }
            
            const updateData = {
                status: newStatus,
                statusUpdatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            if (newStatus === 'out-for-delivery') {
                updateData.pickedUpAt = firebase.firestore.FieldValue.serverTimestamp();
            } else if (newStatus === 'delivered') {
                updateData.deliveredAt = firebase.firestore.FieldValue.serverTimestamp();
            }
            if (proofUrl) updateData.deliveryProof = proofUrl;
            if (notes) updateData.deliveryNotes = notes;
            
            db.collection('orders').doc(deliveryId).update(updateData)
            .then(() => {
                const deliveryModal = bootstrap.Modal.getInstance(document.getElementById('deliveryModal'));
                const proofModal = bootstrap.Modal.getInstance(document.getElementById('proofModal'));
                if (deliveryModal) deliveryModal.hide();
                if (proofModal) proofModal.hide();
                loadDeliveries();
                calculateDashboardStats();
            })
            .catch(error => {
                console.error("Failed to update status:", error);
                alert("Failed to update order status. Please try again.");
                if (actionBtn) {
                    actionBtn.disabled = false;
                    actionBtn.innerHTML = `<i class="fas fa-exclamation-triangle me-1"></i> Try Again`;
                }
            });
        }

        function calculateDashboardStats() {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            db.collection('orders')
                .where('riderId', '==', currentRider.riderId)
                .where('status', '==', 'delivered')
                .where('deliveredAt', '>=', today)
                .get()
                .then(querySnapshot => {
                    completedCount.textContent = querySnapshot.size;
                    earningsCount.textContent = `$${(querySnapshot.size * 5).toFixed(2)}`;
                })
                .catch(error => console.error("Error loading completed deliveries:", error));
        }

        function setupEventListeners() {
            toggleStatusBtn.addEventListener('click', toggleRiderStatus);
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                auth.signOut().then(() => window.location.href = 'login.html');
            });
            refreshDeliveriesBtn.addEventListener('click', () => {
                loadDeliveries();
                calculateDashboardStats();
            });
            proofUpload.addEventListener('change', function(e) {
                const file = e.target.files[0];
                if (file) {
                    proofFile = file;
                    const reader = new FileReader();
                    reader.onload = function(event) {
                        proofImagePreview.src = event.target.result;
                        proofImagePreview.style.display = 'block';
                    };
                    reader.readAsDataURL(file);
                }
            });
            submitProofBtn.addEventListener('click', uploadProof);
        }

        // Helper functions
        function updateRiderStatusUI() {
            if (currentRider.status === "online") {
                riderStatusIndicator.innerHTML = `
                    <span class="rider-status-indicator rider-status-online"></span>
                    <span class="rider-status-badge rider-online">Online</span>
                `;
                toggleStatusBtn.innerHTML = '<i class="fas fa-toggle-on me-1"></i> Go Offline';
                toggleStatusBtn.className = 'btn btn-outline-danger';
            } else {
                riderStatusIndicator.innerHTML = `
                    <span class="rider-status-indicator rider-status-offline"></span>
                    <span class="rider-status-badge rider-offline">Offline</span>
                `;
                toggleStatusBtn.innerHTML = '<i class="fas fa-toggle-off me-1"></i> Go Online';
                toggleStatusBtn.className = 'btn btn-outline-success';
            }
        }

        function toggleRiderStatus() {
            const newStatus = currentRider.status === "online" ? "offline" : "online";
            
            db.collection('users').doc(currentRider.id).update({
                riderStatus: newStatus,
                lastStatusChange: firebase.firestore.FieldValue.serverTimestamp()
            })
            .then(() => {
                currentRider.status = newStatus;
                updateRiderStatusUI();
                
                if (newStatus === "offline") {
                    showNoDeliveriesMessage("You are currently offline. Switch to online mode to receive deliveries.");
                } else {
                    loadDeliveries();
                }
            })
            .catch(error => {
                console.error("Failed to update status:", error);
                alert("Failed to update rider status. Please try again.");
            });
        }

        function showProofModal() {
            proofUpload.value = '';
            proofImagePreview.src = '';
            proofImagePreview.style.display = 'none';
            new bootstrap.Modal(document.getElementById('proofModal')).show();
        }

        function uploadProof() {
            if (!proofFile) {
                alert("Please upload a photo first");
                return;
            }

            submitProofBtn.disabled = true;
            submitProofBtn.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Uploading...`;

            const storageRef = storage.ref();
            const proofRef = storageRef.child(`delivery-proofs/${currentOrderId}/${Date.now()}_${proofFile.name}`);
            
            proofRef.put(proofFile).then(snapshot => snapshot.ref.getDownloadURL())
            .then(downloadURL => {
                const notes = document.getElementById('deliveryNotes').value;
                updateDeliveryStatus(currentOrderId, 'delivered', downloadURL, notes);
            })
            .catch(error => {
                console.error("Error uploading proof:", error);
                alert("Failed to upload proof. Please try again.");
                submitProofBtn.disabled = false;
                submitProofBtn.innerHTML = `Submit Proof`;
            });
        }