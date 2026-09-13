// Login functionality
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        fetch('/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `username=${username}&password=${password}`
        })
        .then(response => {
            if (response.redirected) {
                window.location.href = response.url;
            } else {
                return response.text();
            }
        })
        .then(data => {
            if (data) alert(data);
        });
    });
}

// Register modal
const modal = document.getElementById('registerModal');
const btn = document.getElementById('createAccountBtn');
const span = document.getElementsByClassName('close')[0];

if (btn && modal) {
    btn.onclick = function() {
        modal.style.display = 'block';
    };
}

if (span && modal) {
    span.onclick = function() {
        modal.style.display = 'none';
    };
}

if (modal) {
    window.onclick = function(event) {
        if (event.target == modal) {
            modal.style.display = 'none';
        }
    };
}

const registerForm = document.getElementById('registerForm');
if (registerForm) {
    registerForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const username = document.getElementById('newUsername').value;
        const password = document.getElementById('newPassword').value;

        fetch('/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `username=${username}&password=${password}`
        })
        .then(response => response.text())
        .then(data => {
            alert(data);
            if (modal) modal.style.display = 'none';
        });
    });
}

// Dashboard functionality (for dashboard page)
const appRole = document.body ? document.body.dataset.role : null;
const currencyFormatter = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
});

function formatCurrency(value) {
    const number = Number.parseFloat(value);
    if (Number.isNaN(number)) return value;
    return `Rs. ${currencyFormatter.format(number)}`;
}

function formatAmountInput(input) {
    const number = Number.parseFloat(input.value);
    if (Number.isNaN(number)) return;
    input.value = number.toFixed(2);
}

let currentConsumerScope = appRole === 'Admin' ? 'self' : 'self';
function showPanel(panelName) {
    const panels = document.querySelectorAll('.panel');
    panels.forEach(panel => panel.style.display = 'none');
    document.getElementById(panelName).style.display = 'block';
    if (panelName === 'consumerPanel') loadConsumers(currentConsumerScope);
    if (panelName === 'historyPanel') loadPaymentHistory();
}

function loadConsumers(scope = currentConsumerScope) {
    currentConsumerScope = scope;
    const url = appRole === 'Admin' ? `/consumers?scope=${encodeURIComponent(scope)}` : '/consumers';
    fetch(url)
    .then(response => response.json())
    .then(data => {
        const tbody = document.querySelector('#consumersTable tbody');
        tbody.innerHTML = '';
        let selectedConsumerRow = null;
        const selectRow = (row) => {
            if (selectedConsumerRow) selectedConsumerRow.classList.remove('selected-row');
            selectedConsumerRow = row;
            selectedConsumerRow.classList.add('selected-row');
        };
        data.forEach(consumer => {
            const row = tbody.insertRow();
            row.insertCell(0).textContent = consumer.Consumer_ID;
            row.insertCell(1).textContent = consumer.Name || consumer.UserName;
            row.insertCell(2).textContent = consumer.Phone || consumer.Name;
            row.insertCell(3).textContent = consumer.Meter_ID;
            if (appRole === 'Admin') {
                const actionCell = row.insertCell(4);
                const deleteButton = document.createElement('button');
                deleteButton.type = 'button';
                deleteButton.className = 'danger-button';
                deleteButton.textContent = 'Delete';
                deleteButton.addEventListener('click', (event) => {
                    event.stopPropagation();
                    const confirmDelete = confirm(`Delete consumer ${consumer.Consumer_ID}? This will remove bills and payments too.`);
                    if (!confirmDelete) return;
                    fetch('/delete-consumer', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded'
                        },
                        body: `consumerId=${encodeURIComponent(consumer.Consumer_ID)}`
                    })
                    .then(response => response.text())
                    .then(message => {
                        alert(message);
                        loadConsumers(currentConsumerScope);
                        loadMeterBills(null);
                    });
                });
                actionCell.appendChild(deleteButton);
            }
            row.classList.add('clickable-row');
            row.addEventListener('click', () => {
                selectRow(row);
                loadMeterBills(consumer.Meter_ID);
            });
        });
    });
}

function renderEmptyRow(tbody, message, colCount) {
    const row = tbody.insertRow();
    const cell = row.insertCell(0);
    cell.colSpan = colCount;
    cell.textContent = message;
    cell.classList.add('table-empty');
}

function loadMeterBills(meterId) {
    const label = document.getElementById('selectedMeterLabel');
    const tbody = document.querySelector('#meterBillsTable tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    if (!meterId) {
        if (label) label.textContent = 'Select a consumer to view bills.';
        renderEmptyRow(tbody, 'No meter selected.', 5);
        return;
    }

    if (label) label.textContent = `Meter ID: ${meterId}`;
    fetch(`/meter-bills?meterId=${encodeURIComponent(meterId)}`)
    .then(response => response.json())
    .then(data => {
        tbody.innerHTML = '';
        if (!data || data.length === 0) {
            renderEmptyRow(tbody, 'No bills found for this meter.', 5);
            return;
        }
        data.forEach(bill => {
            const row = tbody.insertRow();
            row.insertCell(0).textContent = bill.Bill_ID;
            row.insertCell(1).textContent = bill.Bill_Date;
            row.insertCell(2).textContent = bill.Due_Date;
            row.insertCell(3).textContent = formatCurrency(bill.Total_Amount);
            row.insertCell(4).textContent = bill.Status;
        });
    });
}

function loadPaymentHistory() {
    fetch('/payment-history')
    .then(response => response.json())
    .then(data => {
        const tbody = document.querySelector('#paymentHistoryTable tbody');
        tbody.innerHTML = '';
        data.forEach(payment => {
            const row = tbody.insertRow();
            row.insertCell(0).textContent = payment.Payment_ID;
            row.insertCell(1).textContent = payment.Payment_Date;
            row.insertCell(2).textContent = formatCurrency(payment.Amount);
            row.insertCell(3).textContent = payment.Payment_Mode;
            row.insertCell(4).textContent = payment.Bill_ID;
            if (payment.Name) {
                row.insertCell(5).textContent = payment.Name;
                row.insertCell(6).textContent = payment.Phone;
            }
        });
    });
}

document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('consumersTable')) {
        loadConsumers(currentConsumerScope);
        if (document.getElementById('meterBillsTable')) {
            loadMeterBills(null);
        }
    }
    if (document.getElementById('paymentHistoryTable')) {
        loadPaymentHistory();
    }

    // Add consumer form
    const addConsumerForm = document.getElementById('addConsumerForm');
    if (addConsumerForm) {
        addConsumerForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const formData = new URLSearchParams(new FormData(addConsumerForm));
            fetch('/add-consumer', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: formData.toString()
            })
            .then(response => response.text())
            .then(data => {
                alert(data);
                addConsumerForm.reset();
                loadConsumers();
            });
        });
    }

    // Generate bill form
    const generateBillForm = document.getElementById('generateBillForm');
    if (generateBillForm) {
        generateBillForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const formData = new URLSearchParams(new FormData(generateBillForm));
            fetch('/generate-bill', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: formData.toString()
            })
            .then(response => response.text())
            .then(data => {
                alert(data);
                generateBillForm.reset();
                loadPaymentHistory();
            });
        });
    }

    // Pay bill form
    const payBillForm = document.getElementById('payBillForm');
    if (payBillForm) {
        const amountInput = payBillForm.querySelector('input[name="amount"]');
        if (amountInput) {
            amountInput.addEventListener('blur', () => formatAmountInput(amountInput));
        }
        payBillForm.addEventListener('submit', function(e) {
            e.preventDefault();
            if (amountInput) formatAmountInput(amountInput);
            const formData = new URLSearchParams(new FormData(payBillForm));
            fetch('/pay-bill', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: formData.toString()
            })
            .then(response => response.text())
            .then(data => {
                alert(data);
                payBillForm.reset();
                loadPaymentHistory();
            });
        });
    }

    const filterButtons = document.querySelectorAll('[data-consumer-scope]');
    if (filterButtons.length) {
        filterButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.consumerScope === currentConsumerScope);
        });
        filterButtons.forEach(button => {
            button.addEventListener('click', () => {
                filterButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                loadConsumers(button.dataset.consumerScope);
                loadMeterBills(null);
            });
        });
    }
});
