const asText = (value) => String(value ?? "").trim();

const getNestedRecords = (row) => [
  row,
  row?.user,
  row?.customer,
  row?.profile,
].filter((value) => value && typeof value === "object");

const firstValue = (records, keys) => {
  for (const record of records) {
    for (const key of keys) {
      const value = asText(record?.[key]);
      if (value) return value;
    }
  }
  return "";
};

const firstDate = (records, keys) => {
  for (const record of records) {
    for (const key of keys) {
      const value = record?.[key];
      const timestamp = Date.parse(value);
      if (Number.isFinite(timestamp)) return new Date(timestamp).toISOString();
    }
  }
  return "";
};

const toAmount = (value) => {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
};

export const normalizeEmail = (value) => asText(value).toLowerCase();

export const pickArray = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.results)) return payload.results;
  if (Array.isArray(payload.users)) return payload.users;
  if (Array.isArray(payload.customers)) return payload.customers;
  if (Array.isArray(payload.orders)) return payload.orders;
  if (Array.isArray(payload.order)) return payload.order;
  if (payload.data && typeof payload.data === "object") return pickArray(payload.data);
  if (payload.result && typeof payload.result === "object") return pickArray(payload.result);
  return [];
};

const readCustomerFields = (row) => {
  const records = getNestedRecords(row);
  const firstName = firstValue(records, ["firstName"]);
  const lastName = firstValue(records, ["lastName"]);
  const composedName = [firstName, lastName].filter(Boolean).join(" ");
  const email = normalizeEmail(
    firstValue(records, ["email", "customerEmail", "userEmail"])
  );

  return {
    name: firstValue(records, ["name", "customerName"]) || composedName,
    email,
    phone: firstValue(records, [
      "phoneNumber",
      "phone",
      "contact",
      "contactNumber",
      "mobile",
    ]),
    address: firstValue(records, ["address", "shippingAddress", "street"]),
    city: firstValue(records, ["city"]),
    country: firstValue(records, ["country"]),
  };
};

const getRecordId = (row, index) =>
  asText(row?._id || row?.id || row?.invoice || row?.orderId) || `row-${index}`;

const getRecordDate = (row, source) => {
  const records = getNestedRecords(row);
  const keys = source === "orders"
    ? ["createdAt", "updatedAt", "orderDate"]
    : ["lastOrderDate", "createdAt", "joiningDate", "updatedAt"];
  return firstDate(records, keys);
};

const getJoinedDate = (row) =>
  firstDate(getNestedRecords(row), ["createdAt", "joiningDate"]);

const getDirectOrderCount = (row) => {
  const directCount = toAmount(row?.totalOrders);
  const referencedOrders = Array.isArray(row?.orders) ? row.orders.length : 0;
  return Math.max(directCount, referencedOrders);
};

const createRecord = ({ row, source, index }) => {
  const fields = readCustomerFields(row);
  const id = getRecordId(row, index);
  const isOrder = source === "orders";
  const orderDate = getRecordDate(row, source);
  const key = fields.email
    ? `email:${fields.email}`
    : `record:${source}:${id}`;

  return {
    key,
    id: key,
    name: fields.name,
    email: fields.email,
    phone: fields.phone,
    address: fields.address,
    city: fields.city,
    country: fields.country,
    totalOrders: isOrder ? 1 : getDirectOrderCount(row),
    totalSpent: isOrder ? toAmount(row?.totalAmount) : toAmount(row?.totalSpent),
    lastOrderDate: isOrder ? orderDate : firstDate(getNestedRecords(row), ["lastOrderDate"]),
    createdAt: getJoinedDate(row) || orderDate,
    isSubscribedToMarketing:
      typeof row?.isSubscribedToMarketing === "boolean"
        ? row.isSubscribedToMarketing
        : null,
    recordCount: 1,
    source,
    orderIds: isOrder ? [id] : [],
  };
};

const preferValue = (current, next) => current || next || "";

const mergeRecord = (current, next) => {
  const mergedOrderIds = Array.from(new Set([...(current.orderIds || []), ...(next.orderIds || [])]));
  const isOrderRecord = next.source === "orders";
  const nextDate = Date.parse(next.lastOrderDate);
  const currentDate = Date.parse(current.lastOrderDate);
  const nextCreated = Date.parse(next.createdAt);
  const currentCreated = Date.parse(current.createdAt);

  return {
    ...current,
    name: preferValue(current.name, next.name),
    email: preferValue(current.email, next.email),
    phone: preferValue(current.phone, next.phone),
    address: preferValue(current.address, next.address),
    city: preferValue(current.city, next.city),
    country: preferValue(current.country, next.country),
    totalOrders: isOrderRecord
      ? current.totalOrders + next.totalOrders
      : Math.max(current.totalOrders, next.totalOrders),
    totalSpent: isOrderRecord
      ? current.totalSpent + next.totalSpent
      : Math.max(current.totalSpent, next.totalSpent),
    lastOrderDate:
      Number.isFinite(nextDate) && (!Number.isFinite(currentDate) || nextDate > currentDate)
        ? next.lastOrderDate
        : current.lastOrderDate,
    createdAt:
      Number.isFinite(nextCreated) && (!Number.isFinite(currentCreated) || nextCreated < currentCreated)
        ? next.createdAt
        : current.createdAt,
    isSubscribedToMarketing:
      typeof current.isSubscribedToMarketing === "boolean"
        ? current.isSubscribedToMarketing
        : next.isSubscribedToMarketing,
    recordCount: current.recordCount + next.recordCount,
    source: current.source === next.source ? current.source : "combined",
    orderIds: mergedOrderIds,
  };
};

export const buildCustomerRows = (sources = []) => {
  const customers = new Map();

  sources.forEach(({ rows = [], source }) => {
    rows.forEach((row, index) => {
      const record = createRecord({ row, source, index });
      const existing = customers.get(record.key);
      customers.set(record.key, existing ? mergeRecord(existing, record) : record);
    });
  });

  return Array.from(customers.values()).sort((left, right) => {
    const leftDate = Date.parse(left.lastOrderDate || left.createdAt);
    const rightDate = Date.parse(right.lastOrderDate || right.createdAt);
    if (Number.isFinite(leftDate) && Number.isFinite(rightDate) && leftDate !== rightDate) {
      return rightDate - leftDate;
    }
    return (left.name || left.email || "").localeCompare(right.name || right.email || "");
  });
};
