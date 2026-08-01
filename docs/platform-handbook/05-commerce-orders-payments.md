# 5. Commerce, Orders, Payments, and Customers

## 5.1 Order lifecycle

The order system connects storefront checkout to internal fulfillment. Supported operational states are:

- **Pending:** received but not yet being fulfilled.
- **Processing:** staff are preparing the order.
- **Dispatched:** handed to a courier or local-delivery person.
- **Delivered:** completed delivery.
- **Cancel:** cancelled order.

The UI may display human-friendly variants such as Dispatch or Cancelled, while backend normalization preserves the stored values.

## 5.2 Order creation

The public checkout sends buyer, shipping, payment, cart, coupon, and optional marketing-consent information.

Backend processing includes:

- Removing invalid guest-user references.
- Recognizing accessory and clinical/professional item types.
- Validating accessory-specific checkout data where applicable.
- Recomputing coupon discount and affiliate commission.
- Normalizing payment method and fee.
- Creating the order snapshot.
- Sending customer order confirmation email when enabled.
- Sending internal new-order email when enabled.
- Sending staff/customer WhatsApp notifications when enabled.

## 5.3 Order data

An order normally contains:

- Customer name, email, phone/contact.
- Address, city, country, and postal data.
- Cart item snapshots and quantities.
- Subtotal, shipping, payment fee, discount, and total amount.
- Coupon snapshot and optional affiliate snapshot.
- Payment method and payment state.
- Unique invoice reference.
- Status.
- Courier company, tracking ID, or local-delivery person.
- Marketing opt-in state.
- Payment-verification data and audit entries.

The backend currently reads both the newer and legacy order collections, merges them, and returns a unified admin view without duplicating the same record.

## 5.4 Order queue

The admin order list:

- Loads the current admin endpoint first and keeps fallbacks for legacy compatibility.
- Displays order counts and status categories.
- Supports text search and status filtering.
- Opens the order-detail route.
- Does not require loading every customer profile separately because order snapshots contain the operational buyer data.

## 5.5 Order detail and fulfillment

Order detail presents:

- Buyer and shipping details.
- Cart lines, totals, discounts, and payment method.
- Current status and allowed transitions.
- Dispatch information.
- Payment-verification summary and evidence according to role.
- Audit-related information returned for that role.
- Printable slip with QR reference.

### Dispatch validation

- Courier dispatch requires courier company and tracking ID.
- Local delivery requires courier/local-delivery designation and delivery-person name instead of an external tracking ID.
- Status changes are written to audit logs.
- Processing and Dispatch transitions can trigger customer status email when email is configured.

## 5.6 Payment verification

Payment verification is separate from order fulfillment status. Its record includes:

- Pending or Verified status.
- Verified flag.
- Amount received.
- Received method.
- Received account/location.
- Transaction reference.
- Notes.
- Proof images.
- Verifier identity and timestamp.
- Verification audit logs.

When an online payment is marked Verified, proof imagery is mandatory. The upload accepts up to five JPG, PNG, or WebP files, with a five-megabyte limit for each file.

The backend route permits CEO and Manager access to payment-verification updates, while the current admin interface intentionally presents editing to the CEO and read-oriented visibility to Managers. This frontend/backend difference should be resolved into one explicit policy before broadening use.

## 5.7 Payment-proof handling

- Existing proof images can be retained or removed during an update.
- New proof images upload through multipart form data.
- The frontend shows upload progress.
- Proof images can be previewed and reordered before save.
- Removed Cloudinary evidence is cleaned up after the order update succeeds.
- Public order responses never include internal proof or verification data.

## 5.8 Coupons and affiliates

### Standard coupons

- Coupon code.
- Percentage or configured customer discount.
- Start/end validity.
- Minimum order amount.
- Eligible product type.
- Active/inactive status.

### Affiliate coupons

- Customer benefit.
- Affiliate commission amount.
- Affiliate name, email, phone, and payment details.
- Order-level affiliate snapshot for later accounting.
- Affiliate summary reporting in the admin list.

The backend validates coupons at order creation rather than trusting the amount sent by the browser.

## 5.9 Customer notifications

### Customer email

- Order-received confirmation with items and totals.
- Processing or dispatched status update.
- Courier tracking link where a known courier mapping exists.
- Local-delivery information when there is no external tracking URL.

### Internal email

- New-order summary to configured recipients or active staff roles.
- BCC is used so internal recipient addresses remain private.
- Message contains invoice, customer, shipping, payment, totals, item summary, and admin order link.

### WhatsApp

- Optional new-order staff notification.
- Optional customer order confirmation.
- Optional event-registration messages.
- All depend on backend feature flags and Meta Cloud API credentials.

## 5.10 Customer accounts and customer data

Authenticated users can register, verify email, login, reset/change password, update profile, and view order history.

The admin Customer page is designed to:

- Restrict direct customer visibility to CEO.
- Load customer/user records when a supported endpoint is available.
- Fall back to order and contact information.
- Deduplicate people by normalized email.
- Support search, summary metrics, and CSV export.

The active backend working copy does not currently mount the customer/contact endpoints expected by that screen. Orders remain the dependable source for operational buyer data until those routes are completed.

## 5.11 Order deletion

Permanent deletion is deliberately stronger than ordinary editing:

1. The signed-in user must be CEO.
2. The frontend requests the four-digit secret delete PIN.
3. The PIN is sent in the `x-delete-pin` header.
4. The global backend destructive-action guard validates the CEO token and hashed PIN.
5. Only then does the order-delete controller remove the record.

The CEO login password is not the delete credential. The separate delete PIN is the required second authorization factor for database deletion.

## 5.12 Daily order operating checklist

1. Review new Pending orders.
2. Validate customer and delivery information.
3. Confirm product availability and order totals.
4. Move accepted work to Processing.
5. Add courier/tracking or local-delivery details before Dispatch.
6. Verify payment and attach required proof using the authorized role.
7. Monitor notification failures without blocking the saved order.
8. Mark delivery complete when confirmed.
9. Use cancellation or retention where possible; permanently delete only when genuinely required.
