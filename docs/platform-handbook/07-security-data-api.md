# 7. Security, Roles, Data, and API Reference

## 7.1 Authentication model

### Customer authentication

- Customer signup/login is handled by the User API.
- Passwords are hashed before storage.
- Email verification and password-reset tokens support account recovery.
- The storefront stores the returned customer session in a browser cookie and attaches the bearer token through the Redux API layer.

### Staff authentication

- Admin/staff login uses email and password.
- Password hashes are stored in MongoDB.
- The returned JWT and profile are stored as `adminToken` and `adminData` in browser local storage.
- Frontend route guards provide navigation-level control; backend `verifyToken` and role authorization provide the required server-side control.

### Guest authentication

- Guest Quick Entry uses a separate four-digit PIN.
- The PIN is stored as a hash in `SecuritySetting`.
- Login attempts are rate-limited per apparent client address.
- The Guest JWT expires after eight hours and carries only the employee-entry scope.
- A global guest guard blocks every API request outside the narrow allowlist.

## 7.2 Roles and effective access

| Role | Intended access |
| --- | --- |
| CEO | Full operations, payment review, People/Assets, staff/customer oversight, security settings, and PIN-authorized deletion |
| Manager | Operational management across catalog, orders, events, People/Assets, WhatsApp, coupons, contacts, and map links; no permanent deletion under the global policy |
| Admin | General catalog/order/media operations; excluded from People/Assets and several manager/CEO modules |
| Guest | Create a complete employee Draft only; cannot browse company records |
| ReadOnly | Frontend concept for expense-only observation; not supported by the current backend Admin enum and therefore not fully operational |
| Super Admin / Staff | Present in the backend Admin enum, but many route allowlists name only CEO/Manager/Admin; effective access is inconsistent and requires policy cleanup |

Route-level authorization must be treated as the real security boundary. Hiding a navigation item is not sufficient.

## 7.3 Destructive-action control

The backend applies a global guard to every HTTP DELETE request under `/api`.

Required conditions:

1. A bearer token must exist and be valid.
2. The JWT role must be CEO.
3. The request must include the secret delete PIN in `x-delete-pin`.
4. The PIN must match the hash stored in `SecuritySetting`.

The admin frontend intercepts DELETE calls, opens the CEO authorization dialog, collects the PIN, and adds the header. The login password is not used as the delete credential.

The CEO can change the delete PIN through the dedicated security page by supplying the current PIN and a confirmed new four-digit PIN.

## 7.4 Sensitive-data classification

### Highly sensitive

- Admin/customer password hashes and reset tokens.
- JWT signing secret and active tokens.
- Employee CNIC and CNIC images.
- Employee home address and emergency contacts.
- Employment contract and utility-bill proof.
- Payment proof and internal verification notes.
- Private map links.
- Service credentials for MongoDB, Cloudinary, email, Stripe, WhatsApp, and PMDC.

### Internal operational

- Employee codes, department, designation, office, status, and transfer history.
- Asset tags, serial numbers, purchase price, assigned employee, bike registration, maintenance, and issue costs.
- Customer order contact and delivery data.
- Affiliate details and commissions.
- Staff identities, roles, and statuses.

### Public

- Active catalog/product content.
- Published blog/event content.
- Public clinic/contact/location information.
- Approved marketing images and SEO metadata.

## 7.5 Data-handling controls

- Employee private documents use authenticated Cloudinary delivery where available.
- Document view/download passes through an authorized employee endpoint and records activity.
- Public order responses remove internal payment verification, affiliate commission, and audit details.
- Admin-role order responses remove payment-verification details from ordinary Admin users.
- Guest responses never include employee or asset lists.
- PIN hashes are excluded from ordinary MongoDB queries by schema configuration.
- Sensitive configuration belongs in environment variables, never committed source or documentation.

## 7.6 Main database entities

| Entity | Purpose | Important relationships |
| --- | --- | --- |
| Admin | Staff identity, credentials, role, status | Creates audit actions and controls admin JWT |
| User | Customer identity and account | Referenced by authenticated orders/reviews |
| Products | Retail and legacy professional catalog | Brand/category snapshots, reviews, order snapshots |
| Accessory | Accessory catalog | Public listing and order items |
| Machine | Device catalog | Public inquiry pages |
| Category | Parent/child navigation structure | Product and accessory classification |
| Brand | Reusable manufacturer/brand identity | Product/machine/accessory forms |
| Coupon | Discount and affiliate rules | Applied as an order snapshot |
| OrderNew / Order | Current and legacy order stores | Customer, cart, coupon, payment, audit |
| Review | Customer rating/comment | User and product |
| BlogPost | Editorial content and SEO workflow | Public blog routes |
| TrainingEvent | Public event definition | Registrations |
| TrainingEventRegistration | Doctor registration and PMDC state | Event, verification history |
| PmdcVerificationState | Queue/process lock state | PMDC worker coordination |
| Office | NEES company location | Employees, assets, issues |
| Employee | Identity/employment record | Office, asset custody, activity |
| CompanyAsset | Company-property record | Office, employee assignment, issues |
| AssetIssue | Maintenance/incident/cost record | Asset, office, optional employee |
| SecuritySetting | Hashed security PIN | Delete and guest-entry PIN keys |
| GoogleMapLink | Protected map URL | Family/private category |

## 7.7 API family reference

All main backend routes are mounted under `/api`.

| API family | Representative responsibility | Typical access |
| --- | --- | --- |
| `/user` | Signup, login, verification, password, profile | Public/customer token |
| `/admin` | Staff login/accounts, Guest login, WhatsApp campaigns | Mixed; sensitive operations should be staff-protected |
| `/product` | Product queries and mutations | Public reads; mutation protection needs hardening review |
| `/category` | Category queries and mutations | Public reads; mutation protection needs hardening review |
| `/brand` | Brand queries and mutations | Public reads; mutation protection needs hardening review |
| `/accessories` | Accessory public reads and admin mutations | Public reads; CEO/Manager/Admin writes |
| `/machines` | Machine public reads and admin mutations | Public reads; CEO/Manager/Admin writes |
| `/order` | Checkout, payment intent, admin orders, status/payment updates | Public create/detail plus protected admin actions |
| `/user-order` | Customer order history and dashboard summaries | Mixed legacy/current behavior |
| `/coupon` | Public coupons and admin coupon operations | Current router protection needs hardening review |
| `/review` | Review create/delete | Current router protection needs hardening review |
| `/blogs` | Public publishing and admin editorial CRUD | Public reads; protected writes |
| `/training-events` | Public events/registration and admin PMDC operations | Public registration; protected administration |
| `/cloudinary` | Media upload/list/delete | CEO/Manager/Admin |
| `/employees` | Guest entry and full employee registry | Guest allowlist or Manager/CEO |
| `/offices` | Office registry | Manager/CEO |
| `/assets` | Company assets and custody | Manager/CEO |
| `/asset-issues` | Asset incidents and maintenance | Manager/CEO |
| `/security` | Delete-PIN status/change | CEO |
| `/google-map-links` | Protected private/family links | Admin/Manager/CEO plus map PIN |
| `/health` | Health response | Public |

## 7.8 API conventions

- JSON is used for ordinary requests and responses.
- Bearer authentication uses `Authorization: Bearer <token>`.
- Multipart `FormData` is used for media, private documents, and payment proof.
- Newer controllers commonly return `{ success, message, data }`.
- Older controllers may return less consistent shapes; frontend normalizers and fallbacks account for that.
- Validation failures generally return HTTP 400; unauthenticated/invalid token 401/403; missing records 404; conflicts 409.

## 7.9 Current security-hardening priorities

The following are implementation observations, not optional documentation suggestions:

1. Some legacy product, category, brand, coupon, review, user-profile, and admin-account mutation routes do not consistently apply `verifyToken` and explicit role authorization in the router.
2. Admin self-registration currently accepts a requested role through a public route. Production policy should replace this with invitation/CEO-controlled account creation.
3. Map Links uses a shared PIN transmitted from the browser and compared directly against an environment/default value. It is an extra gate, not strong cryptographic authorization, and should be redesigned if the data is highly sensitive.
4. `ReadOnly`, `Super Admin`, and `Staff` role behavior is not consistently aligned between the frontend route guard, backend Admin enum, and endpoint allowlists.
5. In-memory Guest rate limiting is per serverless instance. A shared/managed rate limiter is preferable for strict production enforcement.
6. Secrets and default PINs should be rotated through secure operational procedures and must not be published in documentation.
