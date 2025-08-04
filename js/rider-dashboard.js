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
        const deliveriesList = document.getElementById('deliveriesList');
        const deliveryModal = $('#deliveryModal');
        const assignedDeliveries = document.getElementById('assignedDeliveries');
        const inProgressDeliveries = document.getElementById('inProgressDeliveries');
        const completedDeliveries = document.getElementById('completedDeliveries');
        const updateStatusBtn = document.getElementById('updateStatusBtn');
        const goOfflineBtn = document.getElementById('goOfflineBtn');
        const startNavigationBtn = document.getElementById('startNavigationBtn');
        const messageButton = document.getElementById('messageButton');
        const messageSidebar = document.getElementById('messageSidebar');
        const closeMessageSidebar = document.getElementById('closeMessageSidebar');
        const conversationList = document.getElementById('conversationList');
        const messageRecipient = document.getElementById('messageRecipient');
        const sendNewMessageBtn = document.getElementById('sendNewMessageBtn');
        const messageBadge = document.getElementById('messageBadge');

        // Global variables
        let currentUserRole = '';
        let currentUserId = '';
        let currentConversation = null;
        let unsubscribeMessages = null;
        let unsubscribeConversations = null;
        let currentDeliveryId = null;
        let currentDeliveryStatus = null;

        // Check authentication state
        auth.onAuthStateChanged((user) => {
            if (!user) {
                window.location.href = 'login.html';
            } else {
                currentUserId = user.uid;
                // Check user role
                db.collection('users').doc(user.uid).get().then((doc) => {
                    if (doc.exists) {
                        currentUserRole = doc.data().role;
                        
                        if (currentUserRole === 'rider') {
                            // Load rider's deliveries
                            loadRiderDeliveries(user.uid);
                            // Initialize messaging
                            initMessaging();
                            // Load recipients for new messages
                            loadRecipients();
                        } else {
                            // Redirect to appropriate dashboard
                            if (currentUserRole === 'admin') {
                                window.location.href = 'admin-dashboard.html';
                            } else {
                                window.location.href = 'user-dashboard.html';
                            }
                        }
                    }
                });
            }
        });

        // Initialize messaging system
        function initMessaging() {
            // Setup event listeners
            messageButton.addEventListener('click', toggleMessageSidebar);
            closeMessageSidebar.addEventListener('click', toggleMessageSidebar);
            sendNewMessageBtn.addEventListener('click', sendNewMessage);
            
            // Load conversations
            loadConversations();
            
            // Listen for new messages
            listenForNewMessages();
        }

        function toggleMessageSidebar() {
            messageSidebar.classList.toggle('open');
            if (messageSidebar.classList.contains('open')) {
                markMessagesAsRead();
            }
        }

        function loadRecipients() {
            db.collection('users')
                .where('role', 'in', ['admin', 'user']) // Riders can message admins and users
                .get()
                .then((snapshot) => {
                    messageRecipient.innerHTML = '<option value="">Select recipient</option>';
                    
                    snapshot.forEach((doc) => {
                        const user = doc.data();
                        if (doc.id !== currentUserId) { // Don't show current user as recipient
                            messageRecipient.innerHTML += `
                                <option value="${doc.id}">${user.name || user.email} (${user.role})</option>
                            `;
                        }
                    });
                });
        }

        function loadConversations() {
            db.collection('conversations')
                .where('participants', 'array-contains', currentUserId)
                .orderBy('lastUpdated', 'desc')
                .onSnapshot((snapshot) => {
                    conversationList.innerHTML = '';
                    
                    let unreadCount = 0;
                    
                    snapshot.forEach((doc) => {
                        const conversation = doc.data();
                        const conversationId = doc.id;
                        const otherParticipantId = conversation.participants.find(id => id !== currentUserId);
                        const userUnread = conversation.unreadCounts?.[currentUserId] || 0;
                        unreadCount += userUnread;
                        
                        const otherUser = conversation.participantsData[otherParticipantId];
                        
                        const conversationItem = document.createElement('li');
                        conversationItem.className = `conversation-item ${conversationId === currentConversation ? 'active' : ''}`;
                        conversationItem.innerHTML = `
                            <div class="d-flex justify-content-between">
                                <div class="conversation-user">${otherUser?.name || 'Unknown'} (${otherUser?.role})</div>
                                <div class="conversation-time">${formatTime(conversation.lastUpdated?.toDate())}</div>
                            </div>
                            <div class="conversation-preview">${conversation.lastMessage || 'No messages yet'}</div>
                            ${userUnread > 0 ? `<div class="unread-count">${userUnread}</div>` : ''}
                        `;
                        
                        conversationItem.addEventListener('click', () => {
                            loadConversation(conversationId, otherParticipantId);
                        });
                        
                        conversationList.appendChild(conversationItem);
                    });
                    
                    updateMessageBadges(unreadCount);
                });
        }

        function loadConversation(conversationId, otherParticipantId) {
            currentConversation = conversationId;
            
            // Highlight active conversation
            document.querySelectorAll('.conversation-item').forEach(item => {
                item.classList.remove('active');
            });
            
            // Mark messages as read
            markMessagesAsRead(conversationId);
            
            // Load user info
            db.collection('conversations').doc(conversationId).get().then((doc) => {
                const conversation = doc.data();
                const otherUser = conversation.participantsData[otherParticipantId];
                
                // Create conversation view
                const conversationView = `
                    <div class="message-header">
                        <h5>${otherUser?.name || 'Unknown'} (${otherUser?.role})</h5>
                    </div>
                    <div class="message-container" id="activeConversationMessages"></div>
                    <div class="message-input-container">
                        <input type="text" class="message-input" id="messageInput" placeholder="Type your message...">
                        <button class="btn btn-primary send-message-btn" id="sendMessageBtn">
                            <i class="fas fa-paper-plane"></i>
                        </button>
                    </div>
                `;
                
                document.getElementById('conversations').innerHTML = conversationView;
                
                // Load messages
                loadMessages(conversationId);
                
                // Setup message sending
                document.getElementById('sendMessageBtn').addEventListener('click', sendMessage);
                document.getElementById('messageInput').addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        sendMessage();
                    }
                });
                
                // Switch to conversations tab
                document.getElementById('conversations-tab').click();
            });
        }

        function loadMessages(conversationId) {
            const messagesContainer = document.getElementById('activeConversationMessages');
            messagesContainer.innerHTML = '';
            
            // Unsubscribe previous listener if exists
            if (unsubscribeMessages) unsubscribeMessages();
            
            unsubscribeMessages = db.collection('conversations').doc(conversationId)
                .collection('messages')
                .orderBy('timestamp', 'asc')
                .onSnapshot((snapshot) => {
                    snapshot.docChanges().forEach((change) => {
                        if (change.type === 'added') {
                            const message = change.doc.data();
                            displayMessage(message, messagesContainer);
                        }
                    });
                    
                    // Scroll to bottom
                    messagesContainer.scrollTop = messagesContainer.scrollHeight;
                });
        }

        function displayMessage(message, container) {
            const messageElement = document.createElement('div');
            messageElement.className = `message ${message.senderId === currentUserId ? 'user-message' : 'other-message'}`;
            
            messageElement.innerHTML = `
                <div class="message-sender">${message.senderName}</div>
                <div class="message-content">${message.content}</div>
                <div class="message-time">${formatTime(message.timestamp?.toDate())}</div>
            `;
            
            container.appendChild(messageElement);
        }

        function sendMessage() {
            const input = document.getElementById('messageInput');
            const content = input.value.trim();
            
            if (!content || !currentConversation) return;
            
            db.collection('users').doc(currentUserId).get().then((userDoc) => {
                const userData = userDoc.data();
                
                // Add message to conversation
                db.collection('conversations').doc(currentConversation).collection('messages').add({
                    content: content,
                    senderId: currentUserId,
                    senderName: userData.name || auth.currentUser.email,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                    read: false
                });
                
                // Update conversation last message
                db.collection('conversations').doc(currentConversation).update({
                    lastMessage: content,
                    lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
                    [`unreadCounts.${getOtherParticipant(currentConversation)}`]: firebase.firestore.FieldValue.increment(1)
                });
                
                input.value = '';
            });
        }

        function sendNewMessage() {
            const recipientId = messageRecipient.value;
            const messageText = document.getElementById('newMessageText').value.trim();
            
            if (!recipientId || !messageText) {
                alert('Please select a recipient and enter a message');
                return;
            }
            
            const conversationId = [currentUserId, recipientId].sort().join('_');
            
            // Create conversation if it doesn't exist
            db.runTransaction((transaction) => {
                return transaction.get(db.collection('conversations').doc(conversationId)).then((doc) => {
                    if (!doc.exists) {
                        // Get both users' data
                        return Promise.all([
                            db.collection('users').doc(currentUserId).get(),
                            db.collection('users').doc(recipientId).get()
                        ]).then(([currentUserDoc, recipientDoc]) => {
                            const currentUserData = currentUserDoc.data();
                            const recipientData = recipientDoc.data();
                            
                            transaction.set(db.collection('conversations').doc(conversationId), {
                                participants: [currentUserId, recipientId],
                                participantsData: {
                                    [currentUserId]: {
                                        name: currentUserData.name || auth.currentUser.email,
                                        role: currentUserRole
                                    },
                                    [recipientId]: {
                                        name: recipientData.name || recipientData.email,
                                        role: recipientData.role
                                    }
                                },
                                lastMessage: messageText.substring(0, 30),
                                lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
                                unreadCounts: {
                                    [currentUserId]: 0,
                                    [recipientId]: 1
                                }
                            });
                        });
                    }
                    return db.collection('conversations').doc(conversationId);
                });
            }).then((conversationRef) => {
                // Add the message
                return conversationRef.collection('messages').add({
                    content: messageText,
                    senderId: currentUserId,
                    senderName: auth.currentUser.displayName || 'Rider',
                    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                    read: false
                });
            }).then(() => {
                // Clear form
                document.getElementById('newMessageText').value = '';
                
                // Load the new conversation
                loadConversation(conversationId, recipientId);
            }).catch((error) => {
                console.error("Error sending message: ", error);
                alert('Error sending message. Please try again.');
            });
        }

        function markMessagesAsRead(conversationId = null) {
            if (conversationId) {
                db.collection('conversations').doc(conversationId).update({
                    [`unreadCounts.${currentUserId}`]: 0
                });
            } else {
                db.collection('conversations')
                    .where('participants', 'array-contains', currentUserId)
                    .get()
                    .then((snapshot) => {
                        snapshot.forEach((doc) => {
                            if (doc.data().unreadCounts?.[currentUserId] > 0) {
                                db.collection('conversations').doc(doc.id).update({
                                    [`unreadCounts.${currentUserId}`]: 0
                                });
                            }
                        });
                    });
            }
            
            updateMessageBadges();
        }

        function listenForNewMessages() {
            unsubscribeConversations = db.collection('conversations')
                .where('participants', 'array-contains', currentUserId)
                .onSnapshot((snapshot) => {
                    let totalUnread = 0;
                    
                    snapshot.forEach((doc) => {
                        const unread = doc.data().unreadCounts?.[currentUserId] || 0;
                        totalUnread += unread;
                    });
                    
                    updateMessageBadges(totalUnread);
                });
        }

        function updateMessageBadges(count = 0) {
            if (count > 0) {
                messageBadge.textContent = count;
                messageBadge.style.display = 'flex';
            } else {
                messageBadge.style.display = 'none';
            }
        }

        function getOtherParticipant(conversationId) {
            return conversationId.split('_').find(id => id !== currentUserId);
        }

        function formatTime(date) {
            if (!date) return '';
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }

        // Load rider's deliveries
        function loadRiderDeliveries(riderId) {
            // Get today's date at midnight for completed deliveries count
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            // Listen for assigned deliveries
            db.collection('deliveries')
                .where('riderId', '==', riderId)
                .where('status', 'in', ['assigned', 'picked', 'delivered'])
                .orderBy('status')
                .orderBy('deliveryTime', 'asc')
                .onSnapshot((snapshot) => {
                    let assignedCount = 0;
                    let inProgressCount = 0;
                    let completedCount = 0;
                    let deliveriesHtml = '';
                    
                    snapshot.forEach((doc) => {
                        const delivery = doc.data();
                        const deliveryId = doc.id;
                        const deliveryTime = new Date(delivery.deliveryTime.seconds * 1000).toLocaleTimeString();
                        
                        // Count deliveries by status
                        if (delivery.status === 'assigned') assignedCount++;
                        if (delivery.status === 'picked') inProgressCount++;
                        if (delivery.status === 'delivered' && 
                            new Date(delivery.completedTime?.seconds * 1000) >= today) {
                            completedCount++;
                        }
                        
                        // Status badge
                        let statusBadge = '';
                        switch(delivery.status) {
                            case 'assigned':
                                statusBadge = '<span class="delivery-status status-assigned">Assigned</span>';
                                break;
                            case 'picked':
                                statusBadge = '<span class="delivery-status status-picked">Picked Up</span>';
                                break;
                            case 'delivered':
                                statusBadge = '<span class="delivery-status status-delivered">Delivered</span>';
                                break;
                        }
                        
                        // Customer info
                        let customerInfo = '';
                        if (delivery.customerName) {
                            customerInfo = `
                                <div class="d-flex align-items-center">
                                    <div class="mr-2">
                                        <i class="fas fa-user"></i>
                                    </div>
                                    <div>
                                        <strong>${delivery.customerName}</strong>
                                        ${delivery.customerPhone ? `<div class="text-muted small">${delivery.customerPhone}</div>` : ''}
                                    </div>
                                </div>
                            `;
                        }
                        
                        // Delivery address
                        let deliveryAddress = '';
                        if (delivery.deliveryAddress) {
                            deliveryAddress = `
                                <div class="d-flex align-items-center mt-2">
                                    <div class="mr-2">
                                        <i class="fas fa-map-marker-alt"></i>
                                    </div>
                                    <div class="text-truncate">
                                        ${delivery.deliveryAddress}
                                    </div>
                                </div>
                            `;
                        }
                        
                        deliveriesHtml += `
                            <div class="list-group-item delivery-card" data-id="${deliveryId}" data-status="${delivery.status}">
                                <div class="d-flex justify-content-between align-items-center">
                                    <div>
                                        <h6 class="mb-1">Order #${delivery.orderId.substring(0, 8)}</h6>
                                        <small class="text-muted">Delivery by ${deliveryTime}</small>
                                    </div>
                                    <div>
                                        ${statusBadge}
                                    </div>
                                </div>
                                ${customerInfo}
                                ${deliveryAddress}
                                <div class="mt-2 d-flex justify-content-between">
                                    <small class="text-muted">${delivery.items.length} items</small>
                                    <button class="btn btn-sm btn-outline-primary view-delivery" data-id="${deliveryId}">
                                        <i class="fas fa-eye"></i> Details
                                    </button>
                                </div>
                            </div>
                        `;
                    });
                    
                    // Update counts
                    assignedDeliveries.textContent = assignedCount;
                    inProgressDeliveries.textContent = inProgressCount;
                    completedDeliveries.textContent = completedCount;
                    
                    // Update deliveries list
                    deliveriesList.innerHTML = deliveriesHtml;
                    
                    // Add event listeners to view buttons
                    document.querySelectorAll('.view-delivery').forEach(button => {
                        button.addEventListener('click', (e) => {
                            const deliveryId = e.target.getAttribute('data-id');
                            showDeliveryDetails(deliveryId);
                        });
                    });
                    
                    // Add event listeners to delivery cards
                    document.querySelectorAll('.delivery-card').forEach(card => {
                        card.addEventListener('click', (e) => {
                            if (!e.target.classList.contains('view-delivery') && 
                                !e.target.classList.contains('btn')) {
                                const deliveryId = card.getAttribute('data-id');
                                showDeliveryDetails(deliveryId);
                            }
                        });
                    });
                }, (error) => {
                    console.error("Error loading deliveries: ", error);
                });
        }

        // Show delivery details
        function showDeliveryDetails(deliveryId) {
            db.collection('deliveries').doc(deliveryId).get().then((doc) => {
                if (doc.exists) {
                    const delivery = doc.data();
                    currentDeliveryId = deliveryId;
                    currentDeliveryStatus = delivery.status;
                    
                    const deliveryTime = new Date(delivery.deliveryTime.seconds * 1000).toLocaleString();
                    const pickupTime = delivery.pickupTime ? 
                        new Date(delivery.pickupTime.seconds * 1000).toLocaleString() : 'Not picked up yet';
                    const completedTime = delivery.completedTime ? 
                        new Date(delivery.completedTime.seconds * 1000).toLocaleString() : 'Not delivered yet';
                    
                    let itemsHtml = '';
                    delivery.items.forEach(item => {
                        itemsHtml += `
                            <div class="d-flex justify-content-between align-items-center mb-3">
                                <div>
                                    <h6>${item.name}</h6>
                                    <small class="text-muted">Qty: ${item.quantity}</small>
                                </div>
                            </div>
                        `;
                    });
                    
                    let statusBadge = '';
                    let statusButtonText = '';
                    let statusButtonAction = '';
                    
                    switch(delivery.status) {
                        case 'assigned':
                            statusBadge = '<span class="delivery-status status-assigned">Assigned</span>';
                            statusButtonText = 'Mark as Picked Up';
                            statusButtonAction = 'picked';
                            break;
                        case 'picked':
                            statusBadge = '<span class="delivery-status status-picked">Picked Up</span>';
                            statusButtonText = 'Mark as Delivered';
                            statusButtonAction = 'delivered';
                            break;
                        case 'delivered':
                            statusBadge = '<span class="delivery-status status-delivered">Delivered</span>';
                            statusButtonText = 'Delivery Completed';
                            statusButtonAction = 'completed';
                            break;
                    }
                    
                    document.getElementById('deliveryDetails').innerHTML = `
                        <div class="row">
                            <div class="col-md-6">
                                <p><strong>Delivery ID:</strong> ${deliveryId.substring(0, 8)}</p>
                                <p><strong>Order ID:</strong> ${delivery.orderId.substring(0, 8)}</p>
                                <p><strong>Status:</strong> ${statusBadge}</p>
                            </div>
                            <div class="col-md-6">
                                <p><strong>Scheduled Time:</strong> ${deliveryTime}</p>
                                <p><strong>Pickup Time:</strong> ${pickupTime}</p>
                                <p><strong>Delivery Time:</strong> ${completedTime}</p>
                            </div>
                        </div>
                        
                        <div class="row mt-4">
                            <div class="col-md-6">
                                <h5>Customer Information</h5>
                                <p><strong>Name:</strong> ${delivery.customerName || 'Not specified'}</p>
                                <p><strong>Phone:</strong> ${delivery.customerPhone || 'Not specified'}</p>
                                <p><strong>Delivery Notes:</strong> ${delivery.deliveryNotes || 'None'}</p>
                            </div>
                            <div class="col-md-6">
                                <h5>Delivery Address</h5>
                                <p>${delivery.deliveryAddress}</p>
                                ${delivery.deliveryInstructions ? 
                                    `<p><strong>Instructions:</strong> ${delivery.deliveryInstructions}</p>` : ''}
                            </div>
                        </div>
                        
                        <div class="mt-4">
                            <h5>Order Items</h5>
                            ${itemsHtml}
                        </div>
                    `;
                    
                    // Update status button
                    updateStatusBtn.textContent = statusButtonText;
                    updateStatusBtn.onclick = () => updateDeliveryStatus(deliveryId, statusButtonAction);
                    
                    // Disable button if delivery is already completed
                    if (delivery.status === 'delivered') {
                        updateStatusBtn.disabled = true;
                        updateStatusBtn.classList.remove('btn-primary');
                        updateStatusBtn.classList.add('btn-success');
                    } else {
                        updateStatusBtn.disabled = false;
                        updateStatusBtn.classList.remove('btn-success');
                        updateStatusBtn.classList.add('btn-primary');
                    }
                    
                    deliveryModal.modal('show');
                }
            });
        }

        // Update delivery status
        function updateDeliveryStatus(deliveryId, newStatus) {
            const updateData = {
                status: newStatus,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            if (newStatus === 'picked') {
                updateData.pickupTime = firebase.firestore.FieldValue.serverTimestamp();
            } else if (newStatus === 'delivered') {
                updateData.completedTime = firebase.firestore.FieldValue.serverTimestamp();
            }
            
            db.collection('deliveries').doc(deliveryId).update(updateData)
                .then(() => {
                    // Also update the corresponding order status
                    return db.collection('deliveries').doc(deliveryId).get();
                })
                .then((doc) => {
                    const delivery = doc.data();
                    let orderStatus = '';
                    
                    if (newStatus === 'picked') orderStatus = 'shipped';
                    if (newStatus === 'delivered') orderStatus = 'delivered';
                    
                    if (orderStatus && delivery.orderId) {
                        return db.collection('orders').doc(delivery.orderId).update({
                            status: orderStatus,
                            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                        });
                    }
                })
                .then(() => {
                    alert('Delivery status updated successfully!');
                    deliveryModal.modal('hide');
                })
                .catch((error) => {
                    console.error("Error updating delivery status: ", error);
                    alert('Error updating delivery status. Please try again.');
                });
        }

        // Go offline button
        goOfflineBtn.addEventListener('click', () => {
            if (goOfflineBtn.textContent.includes('Offline')) {
                goOfflineBtn.innerHTML = '<i class="fas fa-toggle-off mr-1"></i> Go Offline';
                goOfflineBtn.classList.remove('btn-danger');
                goOfflineBtn.classList.add('btn-outline-secondary');
                alert('You are now online and available for deliveries.');
            } else {
                goOfflineBtn.innerHTML = '<i class="fas fa-toggle-on mr-1"></i> Go Online';
                goOfflineBtn.classList.remove('btn-outline-secondary');
                goOfflineBtn.classList.add('btn-danger');
                alert('You are now offline and will not receive new deliveries.');
            }
        });

        // Start navigation button
        startNavigationBtn.addEventListener('click', () => {
            if (currentDeliveryId) {
                // In a real app, this would open Google Maps with the delivery address
                alert('Opening navigation to delivery address...');
            } else {
                alert('Please select a delivery first.');
            }
        });

        // Logout
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            auth.signOut().then(() => {
                window.location.href = 'login.html';
            });
        });