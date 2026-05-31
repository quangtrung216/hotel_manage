"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";

type RoomStatus = "available" | "booked" | "occupied" | "cleaning" | "maintenance";
type BookingStatus = "booked" | "checked_in" | "checked_out" | "cancelled";
type InvoiceStatus = "unpaid" | "paid" | "cancelled";
type TabKey = "dashboard" | "rooms" | "customers" | "bookings" | "invoices";

type DashboardSummary = {
  total_rooms: number;
  available_rooms: number;
  occupied_rooms: number;
  today_revenue: string | number;
};

type Room = {
  id: number;
  room_number: string;
  room_type: string;
  price_per_night: string | number;
  status: RoomStatus;
  floor?: number | null;
  note?: string | null;
};

type Customer = {
  id: number;
  full_name: string;
  phone: string;
  email?: string | null;
  address?: string | null;
};

type Booking = {
  id: number;
  customer_id: number;
  room_id: number;
  check_in_date: string;
  check_out_date: string;
  deposit_amount: string | number;
  status: BookingStatus;
  note?: string | null;
  created_at: string;
  customer: Customer;
  room: Room;
};

type Invoice = {
  id: number;
  booking_id: number;
  total_amount: string | number;
  paid_amount: string | number;
  status: InvoiceStatus;
  issued_at: string;
};

type RoomForm = {
  room_number: string;
  room_type: string;
  price_per_night: string;
  status: RoomStatus;
  floor: string;
  note: string;
};

type BookingForm = {
  customer_name: string;
  phone: string;
  room_id: string;
  check_in_date: string;
  check_out_date: string;
  deposit_amount: string;
  note: string;
};

type CustomerForm = {
  full_name: string;
  phone: string;
  email: string;
  address: string;
};

const statusMap: Record<RoomStatus, { label: string; className: string }> = {
  available: { label: "Trống", className: "success" },
  booked: { label: "Đã đặt", className: "warning" },
  occupied: { label: "Đang ở", className: "info" },
  cleaning: { label: "Đang dọn", className: "violet" },
  maintenance: { label: "Bảo trì", className: "danger" },
};

const bookingStatusMap: Record<BookingStatus, { label: string; className: string }> = {
  booked: { label: "Đã đặt", className: "warning" },
  checked_in: { label: "Đang ở", className: "info" },
  checked_out: { label: "Đã trả", className: "success" },
  cancelled: { label: "Đã hủy", className: "danger" },
};

const invoiceStatusMap: Record<InvoiceStatus, { label: string; className: string }> = {
  unpaid: { label: "Chưa thanh toán", className: "warning" },
  paid: { label: "Đã thanh toán", className: "success" },
  cancelled: { label: "Đã hủy", className: "danger" },
};

const emptyRoomForm: RoomForm = {
  room_number: "",
  room_type: "Standard",
  price_per_night: "",
  status: "available",
  floor: "",
  note: "",
};

const emptyBookingForm: BookingForm = {
  customer_name: "",
  phone: "",
  room_id: "",
  check_in_date: "",
  check_out_date: "",
  deposit_amount: "",
  note: "",
};

const emptyCustomerForm: CustomerForm = {
  full_name: "",
  phone: "",
  email: "",
  address: "",
};

const tabs: Array<{ key: TabKey; label: string; icon: string }> = [
  { key: "dashboard", label: "Dashboard", icon: "⌂" },
  { key: "rooms", label: "Quản lý phòng", icon: "▤" },
  { key: "customers", label: "Khách hàng", icon: "◉" },
  { key: "bookings", label: "Đặt phòng", icon: "□" },
  { key: "invoices", label: "Hóa đơn", icon: "▧" },
];

async function requestJson<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Không thể kết nối API" }));
    throw new Error(error.detail ?? "Không thể xử lý yêu cầu");
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

function formatCurrency(value: string | number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0));
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN").format(new Date(value));
}

function toRoomPayload(form: RoomForm) {
  return {
    room_number: form.room_number.trim(),
    room_type: form.room_type,
    price_per_night: Number(form.price_per_night),
    status: form.status,
    floor: form.floor ? Number(form.floor) : null,
    note: form.note.trim() || null,
  };
}

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabKey>("dashboard");
  const [summary, setSummary] = useState<DashboardSummary>({
    total_rooms: 0,
    available_rooms: 0,
    occupied_rooms: 0,
    today_revenue: 0,
  });
  const [rooms, setRooms] = useState<Room[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [upcomingBookings, setUpcomingBookings] = useState<Booking[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [roomForm, setRoomForm] = useState<RoomForm>(emptyRoomForm);
  const [bookingForm, setBookingForm] = useState<BookingForm>({
    ...emptyBookingForm,
    check_in_date: todayInputValue(),
  });
  const [customerForm, setCustomerForm] = useState<CustomerForm>(emptyCustomerForm);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [showRoomForm, setShowRoomForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const availableRooms = useMemo(
    () => rooms.filter((room) => room.status === "available" || room.status === "booked"),
    [rooms],
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [summaryData, roomData, customerData, bookingData, upcomingData, invoiceData] = await Promise.all([
        requestJson<DashboardSummary>("/dashboard/summary"),
        requestJson<{ items: Room[] }>("/rooms?limit=100"),
        requestJson<Customer[]>("/customers?limit=100"),
        requestJson<Booking[]>("/bookings?limit=100"),
        requestJson<Booking[]>("/bookings/upcoming?limit=10"),
        requestJson<Invoice[]>("/invoices?limit=100"),
      ]);

      setSummary(summaryData);
      setRooms(roomData.items);
      setCustomers(customerData);
      setBookings(bookingData);
      setUpcomingBookings(upcomingData);
      setInvoices(invoiceData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tải dữ liệu");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(loadData);
  }, [loadData]);

  function openCreateRoom() {
    setEditingRoom(null);
    setRoomForm(emptyRoomForm);
    setShowRoomForm(true);
  }

  function openEditRoom(room: Room) {
    setEditingRoom(room);
    setRoomForm({
      room_number: room.room_number,
      room_type: room.room_type,
      price_per_night: String(Number(room.price_per_night)),
      status: room.status,
      floor: room.floor ? String(room.floor) : "",
      note: room.note ?? "",
    });
    setShowRoomForm(true);
  }

  async function handleRoomSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      if (editingRoom) {
        await requestJson<Room>(`/rooms/${editingRoom.id}`, {
          method: "PATCH",
          body: JSON.stringify(toRoomPayload(roomForm)),
        });
        setNotice("Đã cập nhật phòng");
      } else {
        await requestJson<Room>("/rooms", {
          method: "POST",
          body: JSON.stringify(toRoomPayload(roomForm)),
        });
        setNotice("Đã thêm phòng mới");
      }
      setShowRoomForm(false);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể lưu phòng");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteRoom(roomId: number) {
    setSaving(true);
    setError("");
    try {
      await requestJson(`/rooms/${roomId}`, { method: "DELETE" });
      setNotice("Đã xóa phòng");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể xóa phòng");
    } finally {
      setSaving(false);
    }
  }

  async function handleBookingSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await requestJson<Booking>("/bookings", {
        method: "POST",
        body: JSON.stringify({
          customer_name: bookingForm.customer_name.trim(),
          phone: bookingForm.phone.trim(),
          room_id: Number(bookingForm.room_id),
          check_in_date: bookingForm.check_in_date,
          check_out_date: bookingForm.check_out_date,
          deposit_amount: Number(bookingForm.deposit_amount || 0),
          note: bookingForm.note.trim() || null,
        }),
      });
      setNotice("Đã tạo đơn đặt phòng");
      setBookingForm({ ...emptyBookingForm, check_in_date: todayInputValue() });
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tạo đặt phòng");
    } finally {
      setSaving(false);
    }
  }

  async function handleCustomerSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await requestJson<Customer>("/customers", {
        method: "POST",
        body: JSON.stringify({
          full_name: customerForm.full_name.trim(),
          phone: customerForm.phone.trim(),
          email: customerForm.email.trim() || null,
          address: customerForm.address.trim() || null,
        }),
      });
      setNotice("Đã thêm khách hàng");
      setCustomerForm(emptyCustomerForm);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể thêm khách hàng");
    } finally {
      setSaving(false);
    }
  }

  async function runBookingAction(bookingId: number, action: "check-in" | "check-out" | "cancel") {
    setSaving(true);
    setError("");
    try {
      await requestJson(`/bookings/${bookingId}/${action}`, { method: "POST" });
      setNotice("Đã cập nhật đặt phòng");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể cập nhật đặt phòng");
    } finally {
      setSaving(false);
    }
  }

  const currentTabLabel = tabs.find((tab) => tab.key === activeTab)?.label ?? "Dashboard";

  return (
    <main className="hotel-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-icon">▥</span>
          <span>Mini Hotel</span>
        </div>

        <nav className="nav-list" aria-label="Điều hướng chính">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              className={`nav-item ${activeTab === tab.key ? "active" : ""}`}
              type="button"
              onClick={() => setActiveTab(tab.key)}
            >
              <span className="nav-icon">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
          <button className="nav-item" type="button">
            <span className="nav-icon">↪</span>
            <span>Đăng xuất</span>
          </button>
        </nav>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">{currentTabLabel}</p>
            <h1>Quản lý khách sạn nhỏ</h1>
          </div>
          <button className="admin-button" type="button">
            <span className="avatar">●</span>
            <span>Admin</span>
            <span>⌄</span>
          </button>
        </header>

        <div className="content">
          {error && <div className="alert danger-alert">{error}</div>}
          {notice && (
            <button className="alert success-alert" type="button" onClick={() => setNotice("")}>
              {notice}
            </button>
          )}
          {loading ? <div className="loading-panel">Đang tải dữ liệu...</div> : null}

          {activeTab === "dashboard" && (
            <DashboardView
              summary={summary}
              rooms={rooms}
              upcomingBookings={upcomingBookings}
              bookingForm={bookingForm}
              setBookingForm={setBookingForm}
              availableRooms={availableRooms}
              onBookingSubmit={handleBookingSubmit}
              onOpenCreateRoom={openCreateRoom}
              onOpenEditRoom={openEditRoom}
              onDeleteRoom={handleDeleteRoom}
              saving={saving}
            />
          )}

          {activeTab === "rooms" && (
            <RoomsView
              rooms={rooms}
              onOpenCreateRoom={openCreateRoom}
              onOpenEditRoom={openEditRoom}
              onDeleteRoom={handleDeleteRoom}
            />
          )}

          {activeTab === "customers" && (
            <CustomersView
              customers={customers}
              customerForm={customerForm}
              setCustomerForm={setCustomerForm}
              onCustomerSubmit={handleCustomerSubmit}
              saving={saving}
            />
          )}

          {activeTab === "bookings" && (
            <BookingsView
              bookings={bookings}
              bookingForm={bookingForm}
              setBookingForm={setBookingForm}
              availableRooms={availableRooms}
              onBookingSubmit={handleBookingSubmit}
              onAction={runBookingAction}
              saving={saving}
            />
          )}

          {activeTab === "invoices" && <InvoicesView invoices={invoices} bookings={bookings} />}
        </div>
      </section>

      {showRoomForm && (
        <div className="modal-backdrop" role="presentation">
          <section className="modal-card" aria-label={editingRoom ? "Sửa phòng" : "Thêm phòng"}>
            <div className="panel-heading">
              <h2>{editingRoom ? "Sửa phòng" : "Thêm phòng"}</h2>
              <button className="icon-button" type="button" onClick={() => setShowRoomForm(false)} aria-label="Đóng">
                ×
              </button>
            </div>
            <RoomEditor
              form={roomForm}
              setForm={setRoomForm}
              onSubmit={handleRoomSubmit}
              saving={saving}
              submitLabel={editingRoom ? "Lưu thay đổi" : "Thêm phòng"}
            />
          </section>
        </div>
      )}
    </main>
  );
}

function DashboardView({
  summary,
  rooms,
  upcomingBookings,
  bookingForm,
  setBookingForm,
  availableRooms,
  onBookingSubmit,
  onOpenCreateRoom,
  onOpenEditRoom,
  onDeleteRoom,
  saving,
}: {
  summary: DashboardSummary;
  rooms: Room[];
  upcomingBookings: Booking[];
  bookingForm: BookingForm;
  setBookingForm: (value: BookingForm) => void;
  availableRooms: Room[];
  onBookingSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onOpenCreateRoom: () => void;
  onOpenEditRoom: (room: Room) => void;
  onDeleteRoom: (roomId: number) => void;
  saving: boolean;
}) {
  return (
    <>
      <StatsGrid summary={summary} />
      <section className="dashboard-grid">
        <div className="left-stack">
          <RoomsPanel
            rooms={rooms.slice(0, 4)}
            total={rooms.length}
            onOpenCreateRoom={onOpenCreateRoom}
            onOpenEditRoom={onOpenEditRoom}
            onDeleteRoom={onDeleteRoom}
            compact
          />
          <UpcomingPanel bookings={upcomingBookings} />
        </div>
        <BookingPanel
          form={bookingForm}
          setForm={setBookingForm}
          rooms={availableRooms}
          onSubmit={onBookingSubmit}
          saving={saving}
        />
      </section>
    </>
  );
}

function StatsGrid({ summary }: { summary: DashboardSummary }) {
  const cards = [
    { label: "Tổng số phòng", value: summary.total_rooms, icon: "▰", accent: "blue" },
    { label: "Phòng trống", value: summary.available_rooms, icon: "▥", accent: "green" },
    { label: "Đang có khách", value: summary.occupied_rooms, icon: "◉", accent: "indigo" },
    { label: "Doanh thu hôm nay", value: formatCurrency(summary.today_revenue), icon: "$", accent: "amber" },
  ];

  return (
    <section className="stats-grid">
      {cards.map((card) => (
        <article className="stat-card" key={card.label}>
          <div className={`stat-icon ${card.accent}`}>{card.icon}</div>
          <div>
            <p>{card.label}</p>
            <strong>{card.value}</strong>
            <span className={`mini-line ${card.accent}`} />
          </div>
        </article>
      ))}
    </section>
  );
}

function RoomsView({
  rooms,
  onOpenCreateRoom,
  onOpenEditRoom,
  onDeleteRoom,
}: {
  rooms: Room[];
  onOpenCreateRoom: () => void;
  onOpenEditRoom: (room: Room) => void;
  onDeleteRoom: (roomId: number) => void;
}) {
  const groups = useMemo(
    () => [
      { label: "Trống", value: rooms.filter((room) => room.status === "available").length },
      { label: "Đã đặt", value: rooms.filter((room) => room.status === "booked").length },
      { label: "Đang ở", value: rooms.filter((room) => room.status === "occupied").length },
      { label: "Cần xử lý", value: rooms.filter((room) => ["cleaning", "maintenance"].includes(room.status)).length },
    ],
    [rooms],
  );

  return (
    <section className="tab-layout">
      <div className="metric-row">
        {groups.map((group) => (
          <article className="small-metric" key={group.label}>
            <span>{group.label}</span>
            <strong>{group.value}</strong>
          </article>
        ))}
      </div>
      <RoomsPanel
        rooms={rooms}
        total={rooms.length}
        onOpenCreateRoom={onOpenCreateRoom}
        onOpenEditRoom={onOpenEditRoom}
        onDeleteRoom={onDeleteRoom}
      />
    </section>
  );
}

function RoomsPanel({
  rooms,
  total,
  onOpenCreateRoom,
  onOpenEditRoom,
  onDeleteRoom,
  compact = false,
}: {
  rooms: Room[];
  total: number;
  onOpenCreateRoom: () => void;
  onOpenEditRoom: (room: Room) => void;
  onDeleteRoom: (roomId: number) => void;
  compact?: boolean;
}) {
  return (
    <section className="panel">
      <div className="panel-heading">
        <h2>Danh sách phòng</h2>
        <button className="primary-button" type="button" onClick={onOpenCreateRoom}>
          <span>+</span>
          <span>Thêm phòng</span>
        </button>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Số phòng</th>
              <th>Loại phòng</th>
              <th>Giá/đêm</th>
              <th>Tầng</th>
              <th>Trạng thái</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {rooms.map((room) => (
              <tr key={room.id}>
                <td>{room.room_number}</td>
                <td>{room.room_type}</td>
                <td>{formatCurrency(room.price_per_night)}</td>
                <td>{room.floor ?? "-"}</td>
                <td>
                  <StatusBadge value={statusMap[room.status]} />
                </td>
                <td>
                  <div className="table-actions">
                    <button className="icon-button" type="button" onClick={() => onOpenEditRoom(room)} aria-label="Sửa phòng">
                      ✎
                    </button>
                    <button className="icon-button danger" type="button" onClick={() => onDeleteRoom(room.id)} aria-label="Xóa phòng">
                      ×
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="panel-footer">
        <span>
          Hiển thị {rooms.length ? 1 : 0} đến {rooms.length} của {total} phòng
        </span>
        {compact ? (
          <div className="pager">
            <button type="button">‹</button>
            <button className="active" type="button">
              1
            </button>
            <button type="button">2</button>
            <button type="button">3</button>
            <span>...</span>
            <button type="button">6</button>
            <button type="button">›</button>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function BookingPanel({
  form,
  setForm,
  rooms,
  onSubmit,
  saving,
}: {
  form: BookingForm;
  setForm: (value: BookingForm) => void;
  rooms: Room[];
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  saving: boolean;
}) {
  return (
    <section className="panel booking-panel">
      <div className="panel-heading">
        <h2>Tạo đặt phòng</h2>
      </div>
      <form className="form-stack" onSubmit={onSubmit}>
        <Field label="Khách hàng">
          <input
            required
            value={form.customer_name}
            onChange={(event) => setForm({ ...form, customer_name: event.target.value })}
            placeholder="Nhập họ tên khách hàng"
          />
        </Field>
        <Field label="Số điện thoại">
          <input
            required
            value={form.phone}
            onChange={(event) => setForm({ ...form, phone: event.target.value })}
            placeholder="Nhập số điện thoại"
          />
        </Field>
        <Field label="Phòng">
          <select required value={form.room_id} onChange={(event) => setForm({ ...form, room_id: event.target.value })}>
            <option value="">Chọn phòng</option>
            {rooms.map((room) => (
              <option key={room.id} value={room.id}>
                {room.room_number} - {room.room_type} - {formatCurrency(room.price_per_night)}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Ngày nhận phòng">
          <input
            required
            type="date"
            value={form.check_in_date}
            onChange={(event) => setForm({ ...form, check_in_date: event.target.value })}
          />
        </Field>
        <Field label="Ngày trả phòng">
          <input
            required
            type="date"
            value={form.check_out_date}
            onChange={(event) => setForm({ ...form, check_out_date: event.target.value })}
          />
        </Field>
        <Field label="Tiền cọc">
          <input
            type="number"
            min="0"
            value={form.deposit_amount}
            onChange={(event) => setForm({ ...form, deposit_amount: event.target.value })}
            placeholder="Nhập tiền cọc"
          />
        </Field>
        <Field label="Ghi chú">
          <input value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} placeholder="Yêu cầu thêm" />
        </Field>
        <button className="primary-button wide" type="submit" disabled={saving}>
          Tạo đơn đặt phòng
        </button>
      </form>
    </section>
  );
}

function UpcomingPanel({ bookings }: { bookings: Booking[] }) {
  return (
    <section className="panel">
      <div className="panel-heading">
        <h2>Khách sắp check-in</h2>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Khách hàng</th>
              <th>Số điện thoại</th>
              <th>Phòng</th>
              <th>Ngày nhận phòng</th>
              <th>Ghi chú</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((booking) => (
              <tr key={booking.id}>
                <td>{booking.customer.full_name}</td>
                <td>{booking.customer.phone}</td>
                <td>{booking.room.room_number}</td>
                <td>{formatDate(booking.check_in_date)}</td>
                <td>{booking.note || "-"}</td>
              </tr>
            ))}
            {bookings.length === 0 && (
              <tr>
                <td colSpan={5}>Chưa có khách sắp check-in</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="see-all">Xem tất cả ›</div>
    </section>
  );
}

function CustomersView({
  customers,
  customerForm,
  setCustomerForm,
  onCustomerSubmit,
  saving,
}: {
  customers: Customer[];
  customerForm: CustomerForm;
  setCustomerForm: (value: CustomerForm) => void;
  onCustomerSubmit: (event: FormEvent<HTMLFormElement>) => void;
  saving: boolean;
}) {
  return (
    <section className="split-grid">
      <section className="panel">
        <div className="panel-heading">
          <h2>Danh sách khách hàng</h2>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Khách hàng</th>
                <th>Số điện thoại</th>
                <th>Email</th>
                <th>Địa chỉ</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => (
                <tr key={customer.id}>
                  <td>{customer.full_name}</td>
                  <td>{customer.phone}</td>
                  <td>{customer.email || "-"}</td>
                  <td>{customer.address || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <h2>Thêm khách hàng</h2>
        </div>
        <form className="form-stack" onSubmit={onCustomerSubmit}>
          <Field label="Họ tên">
            <input
              required
              value={customerForm.full_name}
              onChange={(event) => setCustomerForm({ ...customerForm, full_name: event.target.value })}
              placeholder="Nhập họ tên"
            />
          </Field>
          <Field label="Số điện thoại">
            <input
              required
              value={customerForm.phone}
              onChange={(event) => setCustomerForm({ ...customerForm, phone: event.target.value })}
              placeholder="Nhập số điện thoại"
            />
          </Field>
          <Field label="Email">
            <input
              type="email"
              value={customerForm.email}
              onChange={(event) => setCustomerForm({ ...customerForm, email: event.target.value })}
              placeholder="email@example.com"
            />
          </Field>
          <Field label="Địa chỉ">
            <textarea
              value={customerForm.address}
              onChange={(event) => setCustomerForm({ ...customerForm, address: event.target.value })}
              placeholder="Nhập địa chỉ"
            />
          </Field>
          <button className="primary-button wide" type="submit" disabled={saving}>
            Lưu khách hàng
          </button>
        </form>
      </section>
    </section>
  );
}

function BookingsView({
  bookings,
  bookingForm,
  setBookingForm,
  availableRooms,
  onBookingSubmit,
  onAction,
  saving,
}: {
  bookings: Booking[];
  bookingForm: BookingForm;
  setBookingForm: (value: BookingForm) => void;
  availableRooms: Room[];
  onBookingSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onAction: (bookingId: number, action: "check-in" | "check-out" | "cancel") => void;
  saving: boolean;
}) {
  return (
    <section className="split-grid">
      <section className="panel wide-panel">
        <div className="panel-heading">
          <h2>Danh sách đặt phòng</h2>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Khách hàng</th>
                <th>Phòng</th>
                <th>Nhận phòng</th>
                <th>Trả phòng</th>
                <th>Tiền cọc</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((booking) => (
                <tr key={booking.id}>
                  <td>
                    <strong>{booking.customer.full_name}</strong>
                    <span className="subline">{booking.customer.phone}</span>
                  </td>
                  <td>{booking.room.room_number}</td>
                  <td>{formatDate(booking.check_in_date)}</td>
                  <td>{formatDate(booking.check_out_date)}</td>
                  <td>{formatCurrency(booking.deposit_amount)}</td>
                  <td>
                    <StatusBadge value={bookingStatusMap[booking.status]} />
                  </td>
                  <td>
                    <div className="inline-actions">
                      {booking.status === "booked" && (
                        <button type="button" onClick={() => onAction(booking.id, "check-in")} disabled={saving}>
                          Check-in
                        </button>
                      )}
                      {booking.status === "checked_in" && (
                        <button type="button" onClick={() => onAction(booking.id, "check-out")} disabled={saving}>
                          Check-out
                        </button>
                      )}
                      {["booked", "checked_in"].includes(booking.status) && (
                        <button className="muted-action" type="button" onClick={() => onAction(booking.id, "cancel")} disabled={saving}>
                          Hủy
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <BookingPanel
        form={bookingForm}
        setForm={setBookingForm}
        rooms={availableRooms}
        onSubmit={onBookingSubmit}
        saving={saving}
      />
    </section>
  );
}

function InvoicesView({ invoices, bookings }: { invoices: Invoice[]; bookings: Booking[] }) {
  const bookingById = useMemo(() => new Map(bookings.map((booking) => [booking.id, booking])), [bookings]);

  return (
    <section className="panel">
      <div className="panel-heading">
        <h2>Hóa đơn</h2>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Mã hóa đơn</th>
              <th>Khách hàng</th>
              <th>Phòng</th>
              <th>Ngày lập</th>
              <th>Tổng tiền</th>
              <th>Đã thu</th>
              <th>Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((invoice) => {
              const booking = bookingById.get(invoice.booking_id);
              return (
                <tr key={invoice.id}>
                  <td>HD{String(invoice.id).padStart(5, "0")}</td>
                  <td>{booking?.customer.full_name ?? "-"}</td>
                  <td>{booking?.room.room_number ?? "-"}</td>
                  <td>{formatDate(invoice.issued_at)}</td>
                  <td>{formatCurrency(invoice.total_amount)}</td>
                  <td>{formatCurrency(invoice.paid_amount)}</td>
                  <td>
                    <StatusBadge value={invoiceStatusMap[invoice.status]} />
                  </td>
                </tr>
              );
            })}
            {invoices.length === 0 && (
              <tr>
                <td colSpan={7}>Chưa có hóa đơn</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function RoomEditor({
  form,
  setForm,
  onSubmit,
  saving,
  submitLabel,
}: {
  form: RoomForm;
  setForm: (value: RoomForm) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  saving: boolean;
  submitLabel: string;
}) {
  return (
    <form className="form-stack" onSubmit={onSubmit}>
      <Field label="Số phòng">
        <input
          required
          value={form.room_number}
          onChange={(event) => setForm({ ...form, room_number: event.target.value })}
          placeholder="101"
        />
      </Field>
      <Field label="Loại phòng">
        <select value={form.room_type} onChange={(event) => setForm({ ...form, room_type: event.target.value })}>
          <option value="Standard">Standard</option>
          <option value="Deluxe">Deluxe</option>
          <option value="Family">Family</option>
          <option value="Suite">Suite</option>
        </select>
      </Field>
      <Field label="Giá/đêm">
        <input
          required
          type="number"
          min="0"
          value={form.price_per_night}
          onChange={(event) => setForm({ ...form, price_per_night: event.target.value })}
          placeholder="400000"
        />
      </Field>
      <Field label="Tầng">
        <input type="number" value={form.floor} onChange={(event) => setForm({ ...form, floor: event.target.value })} placeholder="1" />
      </Field>
      <Field label="Trạng thái">
        <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as RoomStatus })}>
          {Object.entries(statusMap).map(([value, status]) => (
            <option key={value} value={value}>
              {status.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Ghi chú">
        <textarea value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} placeholder="Ghi chú phòng" />
      </Field>
      <button className="primary-button wide" type="submit" disabled={saving}>
        {submitLabel}
      </button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function StatusBadge({ value }: { value: { label: string; className: string } }) {
  return <span className={`status-badge ${value.className}`}>{value.label}</span>;
}
