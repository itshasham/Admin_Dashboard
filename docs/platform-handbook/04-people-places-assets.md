# 4. People, Places, Assets, and Guest Entry

## 4.1 Purpose

The People, Places, and Assets workspace is NEES Medical’s private company registry. It connects employee identity, office location, company property, custody, transfers, and maintenance in one operational record.

The full registry is restricted to **Manager** and **CEO** roles. A **Guest** sees a separate create-only employee form and never receives registry lists.

## 4.2 Workspace views

### Employees

The employee view provides:

- Employee search and office/status filters.
- Draft, Active, On Leave, Inactive, and Terminated states.
- Employee detail with masked CNIC in list-oriented responses.
- Profile, employment, office, document, asset, transfer, and activity information.
- Create/edit onboarding wizard.
- Employee transfer between active offices.
- Secure document view/download.
- CEO-only deletion, subject to delete PIN and asset-return rules.

### Offices

The office view provides:

- Office name, short code, city, full address, manager name, phone, and Active/Inactive state.
- Employee and asset counts by office.
- Search and filtering.
- Create and edit.
- CEO-only deletion after all employees and assets have been transferred away.

Office codes are operational identifiers. They contribute to generated employee codes and should remain short, stable, and unique.

### Assets

The asset view provides:

- Asset registration, search, office/status filtering, and editing.
- Custodian display when assigned to an employee.
- Assignment, return, office transfer, maintenance/issue reporting, and CEO-only deletion.
- Item-specific data, including extended bike information.

Supported item types include Laptop, Desktop, Tablet, Mobile, Monitor, Keyboard, Mouse, Bike, Camera, SIM, Medical Equipment, Office Furniture, and Other.

### Issues and maintenance

The issue view records:

- Issue, Maintenance, Accident, Traffic Fine, Insurance Claim, or Expense.
- Linked asset and office.
- Optional reporting employee.
- Title, description, severity, vendor, cost, status, resolution, and next-service information.
- Reported, In Progress, Resolved, and Closed states.

Maintenance or accident creation places the asset into Under Maintenance condition/lifecycle. When the last open issue is resolved or closed, the backend can return a non-retired asset to Good/Available status.

## 4.3 Employee record structure

### Identity

- System-generated employee code.
- Full legal name.
- Profile photograph.
- Phone and email.
- CNIC plus front/back document.
- Current residential address.
- Emergency contact name, relationship, and phone.

### Employment

- Office.
- Department.
- Designation.
- Joining date.
- Employment status.
- Source: admin portal, Google form/webhook, or guest portal.

### Documents

- Profile photograph.
- CNIC front.
- CNIC back.
- Employment contract.
- Utility-bill/address proof.
- Supporting documents.

Private document references contain URL, Cloudinary public ID, resource type, original filename, and upload date. Private files are opened through authorized backend access, and view/download activity is recorded.

### History

- Office-transfer history.
- Activity history for creation, update, activation, status change, transfer, document access, asset assignment, and asset return.
- Assigned assets and asset-related history.

## 4.4 Manager/CEO employee onboarding

The full admin onboarding wizard has four stages:

1. **Identity:** photograph, name, CNIC, phone, email, residential address, and emergency contact.
2. **Employment:** office, department, designation, joining date, and status.
3. **Documents:** CNIC images and optional supporting/contract/address documents.
4. **Review:** final record summary and activation decision.

An Active employee requires office, phone, email, CNIC, residential address, department, designation, joining date, emergency contact name/phone, profile photograph, and both CNIC images. Draft records can be saved for later completion.

The Employment Contract field and Joining Date field remain available in the CEO/Manager workflow. Contract documentation is not required by the model for activation.

## 4.5 Guest Quick Entry

Guest Quick Entry exists so a trusted helper can collect employee data without receiving company-data access.

### Authentication

- A separate four-digit Guest PIN is entered on the admin login page.
- The backend checks the hashed Guest PIN and rate-limits repeated attempts.
- A successful login creates an eight-hour JWT with role `Guest` and a narrow employee-entry scope.

### Guest-visible workflow

The Guest completes three steps:

1. **Identity:** full name, phone, email, CNIC, and profile photo.
2. **Employment:** office selection, department, designation, and current residential address.
3. **Documents and emergency contact:** emergency contact details, CNIC front, CNIC back, and utility-bill proof.

### Guest required fields

Every field shown in the Guest form is mandatory:

- Full name.
- Phone number.
- Email address.
- CNIC in the accepted format.
- Profile photograph.
- Office.
- Department.
- Designation.
- Current residential address.
- Emergency contact name, relationship, and phone.
- CNIC front and back.
- Utility-bill/address proof.

### Fields deliberately excluded from Guest Mode

- **Joining Date:** not shown and removed if supplied directly to the Guest API.
- **Employment Contract:** not shown, cannot be uploaded by Guest, and removed if supplied directly.

These fields remain available in the full Manager/CEO form.

### Guest restrictions

The Guest token is allowed to call only:

- Office options for the form.
- Required employee-document upload.
- Employee-draft creation.

The Guest cannot:

- List or open employees.
- List company offices beyond the minimal option data needed by the form.
- View or manage assets.
- View orders, expenses, customers, staff, content, or security settings.
- Upload contract or unrelated supporting documents.
- Create an Active employee; every Guest record is forced to Draft.

## 4.6 Office operating rules

- Office code must be unique and is normalized to uppercase.
- Employees and assets may be assigned only to an Active office.
- Changing an employee or asset office must use the dedicated transfer action rather than ordinary edit.
- An office cannot be deleted while it owns employees or assets.
- Deactivation is safer than deletion when the office must remain in historical records.

## 4.7 Asset record structure

### Core asset identity

- Unique asset tag.
- Item type.
- Brand/model.
- Optional unique serial number.
- Owning office.
- Current location.

### Purchase and condition

- Purchase date and price.
- Supplier.
- Warranty expiry.
- Condition: New, Good, Fair, Damaged, or Under Maintenance.
- Lifecycle: Purchased, Registered, Inspected, Available, Assigned, Under Maintenance, Returned, Transferred, Retired, or Sold.
- Backward-compatible assignment state: Unassigned, Assigned, or Retired.

### Documents and specifications

- Photographs.
- Invoice document.
- Supporting documents.
- Flexible technical specifications.

### Bike-specific data

- Manufacturing year.
- Registration, engine, and chassis numbers.
- Color, mileage, and fuel type.
- Insurance expiry.
- Keys, helmet, and issued accessories.
- Last/next service date and next service mileage.
- Registration and insurance documents.

Bike registration, engine, and chassis numbers are mandatory for a Bike asset.

## 4.8 Custody workflow

### Assign an asset

1. Select an unassigned, non-retired asset.
2. Select an employee.
3. Confirm assignment date, condition, notes, and issue photos where used.
4. The backend records the employee, office, status, and assignment-history entry.
5. The employee activity history records the assignment.

### Return an asset

1. Open the assigned asset.
2. Record return date, return condition, notes, and return photos where used.
3. The open assignment-history record receives its return information.
4. The asset returns to inventory and the employee activity history records the return.

### Transfer an asset

- The asset must first be unassigned/returned.
- The destination must be an Active office.
- A transfer reason may be recorded.
- Office history preserves the former and new office.

### Transfer an employee

- The destination must be an Active office.
- The destination cannot be the current office.
- Office history and employee activity history are updated.
- Asset custody should be reviewed so assigned property remains operationally valid.

## 4.9 Deletion and retention rules

- All DELETE requests require a valid CEO session and secret delete PIN.
- An employee cannot be deleted while company assets remain assigned.
- An asset cannot be deleted while assigned.
- Deleting an asset also removes its linked issues; an office with linked employees or assets cannot be deleted.
