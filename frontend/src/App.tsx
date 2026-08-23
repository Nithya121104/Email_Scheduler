import {
  useEffect,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";

const API_BASE_URL = "http://localhost:5000";

type User = {
  id: string;
  googleId: string;
  name: string;
  email: string;
  avatar: string | null;
};

type Email = {
  id: string;
  campaignId: string;
  recipient: string;
  subject: string;
  body: string;
  scheduledAt: string;
  sentAt: string | null;
  status: string;
  attempts: number;
  messageId: string | null;
  previewUrl: string | null;
  error: string | null;
  createdAt: string;
  updatedAt: string;
};

type Tab = "scheduled" | "sent";

function App() {
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  const [activeTab, setActiveTab] =
    useState<Tab>("scheduled");

  const [scheduledEmails, setScheduledEmails] =
    useState<Email[]>([]);

  const [sentEmails, setSentEmails] =
    useState<Email[]>([]);

  const [loadingEmails, setLoadingEmails] =
    useState(false);

  const [composeOpen, setComposeOpen] =
    useState(false);

  const [selectedEmail, setSelectedEmail] =
    useState<Email | null>(null);

  const [search, setSearch] = useState("");

  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [recipients, setRecipients] =
    useState<string[]>([]);

  const [startTime, setStartTime] = useState("");
  const [delayBetweenEmails, setDelayBetweenEmails] =
    useState(2000);
  const [hourlyLimit, setHourlyLimit] =
    useState(100);

  const [scheduleError, setScheduleError] =
    useState("");
  const [scheduleSuccess, setScheduleSuccess] =
    useState("");
  const [scheduling, setScheduling] =
    useState(false);

  const [showSchedulePanel, setShowSchedulePanel] =
    useState(false);

  async function checkAuth() {
    try {
      const response = await fetch(
        `${API_BASE_URL}/auth/me`,
        {
          credentials: "include",
        }
      );

      const data = await response.json();

      if (
        response.ok &&
        data.authenticated &&
        data.user
      ) {
        setUser(data.user);
        setAuthenticated(true);
      } else {
        setUser(null);
        setAuthenticated(false);
      }
    } catch {
      setUser(null);
      setAuthenticated(false);
    } finally {
      setLoadingAuth(false);
    }
  }

  async function fetchEmails() {
    if (!authenticated) return;

    try {
      setLoadingEmails(true);

      const [scheduledResponse, sentResponse] =
        await Promise.all([
          fetch(
            `${API_BASE_URL}/api/emails/scheduled`,
            {
              credentials: "include",
            }
          ),
          fetch(
            `${API_BASE_URL}/api/emails/sent`,
            {
              credentials: "include",
            }
          ),
        ]);

      if (
        scheduledResponse.status === 401 ||
        sentResponse.status === 401
      ) {
        setAuthenticated(false);
        setUser(null);
        return;
      }

      const scheduledData =
        await scheduledResponse.json();

      const sentData =
        await sentResponse.json();

      setScheduledEmails(
        scheduledData.emails || []
      );

      setSentEmails(
        sentData.emails || []
      );
    } catch (error) {
      console.error(
        "Failed to fetch emails",
        error
      );
    } finally {
      setLoadingEmails(false);
    }
  }

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (authenticated) {
      fetchEmails();
    }
  }, [authenticated]);

  useEffect(() => {
    if (!authenticated) return;

    const interval = setInterval(
      fetchEmails,
      3000
    );

    return () => clearInterval(interval);
  }, [authenticated]);

  function handleCSV(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
      const text = String(
        reader.result || ""
      );

      const emails =
        text.match(
          /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi
        ) || [];

      setRecipients(
        Array.from(
          new Set(
            emails.map((email) =>
              email
                .trim()
                .toLowerCase()
            )
          )
        )
      );
    };

    reader.readAsText(file);
  }

  function setTomorrowAt(hour: number) {
    const date = new Date();

    date.setDate(
      date.getDate() + 1
    );

    date.setHours(
      hour,
      0,
      0,
      0
    );

    const local =
      new Date(
        date.getTime() -
          date.getTimezoneOffset() *
            60000
      )
        .toISOString()
        .slice(0, 16);

    setStartTime(local);
  }

  async function handleSchedule(
    event: FormEvent
  ) {
    event.preventDefault();

    setScheduleError("");
    setScheduleSuccess("");

    if (!subject.trim()) {
      setScheduleError(
        "Subject is required."
      );
      return;
    }

    if (!body.trim()) {
      setScheduleError(
        "Email body is required."
      );
      return;
    }

    if (!recipients.length) {
      setScheduleError(
        "Upload a list containing at least one email."
      );
      return;
    }

    if (!startTime) {
      setScheduleError(
        "Please select a send time."
      );
      return;
    }

    const date = new Date(startTime);

    if (
      Number.isNaN(date.getTime()) ||
      date.getTime() <= Date.now()
    ) {
      setScheduleError(
        "Send time must be in the future."
      );
      return;
    }

    try {
      setScheduling(true);

      const response = await fetch(
        `${API_BASE_URL}/api/emails/schedule`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            subject:
              subject.trim(),
            body:
              body.trim(),
            recipients,
            startTime:
              date.toISOString(),
            delayBetweenEmails:
              Number(
                delayBetweenEmails
              ),
            hourlyLimit:
              Number(hourlyLimit),
          }),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to schedule emails"
        );
      }

      setScheduleSuccess(
        `${data.totalEmails} email${
          data.totalEmails === 1
            ? ""
            : "s"
        } scheduled successfully`
      );

      setSubject("");
      setBody("");
      setRecipients([]);
      setStartTime("");
      setShowSchedulePanel(false);

      await fetchEmails();

      setTimeout(() => {
        setComposeOpen(false);
        setScheduleSuccess("");
      }, 1200);
    } catch (error) {
      setScheduleError(
        error instanceof Error
          ? error.message
          : "Failed to schedule emails"
      );
    } finally {
      setScheduling(false);
    }
  }

  async function handleLogout() {
    try {
      await fetch(
        `${API_BASE_URL}/auth/logout`,
        {
          method: "POST",
          credentials: "include",
        }
      );
    } finally {
      setAuthenticated(false);
      setUser(null);
      setScheduledEmails([]);
      setSentEmails([]);
    }
  }

  function closeCompose() {
    setComposeOpen(false);
    setShowSchedulePanel(false);
    setScheduleError("");
    setScheduleSuccess("");
  }

  const currentEmails =
    activeTab === "scheduled"
      ? scheduledEmails
      : sentEmails;

  const filteredEmails =
    currentEmails.filter((email) => {
      const value =
        `${email.recipient} ${email.subject} ${email.body}`
          .toLowerCase();

      return value.includes(
        search.toLowerCase()
      );
    });

  if (loadingAuth) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
      </div>
    );
  }

  if (!authenticated || !user) {
    return (
      <div className="login-page">
        <div className="login-card">
          <h1>Login</h1>

          <a
            href={`${API_BASE_URL}/auth/google`}
            className="google-login"
          >
            <span className="google-icon">
              G
            </span>
            Login with Google
          </a>

          <div className="login-divider">
            <span />
            <p>
              or sign up through email
            </p>
            <span />
          </div>

          <input
            className="login-input"
            placeholder="Email ID"
          />

          <input
            className="login-input"
            placeholder="Password"
            type="password"
          />

          <button className="login-button">
            Login
          </button>
        </div>
      </div>
    );
  }

  if (composeOpen) {
    return (
      <ComposePage
        user={user}
        subject={subject}
        body={body}
        recipients={recipients}
        startTime={startTime}
        delayBetweenEmails={
          delayBetweenEmails
        }
        hourlyLimit={hourlyLimit}
        showSchedulePanel={
          showSchedulePanel
        }
        scheduleError={scheduleError}
        scheduleSuccess={
          scheduleSuccess
        }
        scheduling={scheduling}
        setSubject={setSubject}
        setBody={setBody}
        setStartTime={setStartTime}
        setDelayBetweenEmails={
          setDelayBetweenEmails
        }
        setHourlyLimit={setHourlyLimit}
        setShowSchedulePanel={
          setShowSchedulePanel
        }
        handleCSV={handleCSV}
        setTomorrowAt={setTomorrowAt}
        handleSchedule={
          handleSchedule
        }
        closeCompose={
          closeCompose
        }
      />
    );
  }

  if (selectedEmail) {
    return (
      <EmailDetail
        email={selectedEmail}
        user={user}
        onBack={() =>
          setSelectedEmail(null)
        }
      />
    );
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="logo">
          OHB
        </div>

        <div className="profile-card">
          {user.avatar ? (
            <img
              src={user.avatar}
              alt=""
              className="profile-avatar"
            />
          ) : (
            <div className="profile-avatar fallback">
              {user.name
                .charAt(0)
                .toUpperCase()}
            </div>
          )}

          <div className="profile-info">
            <strong>
              {user.name}
            </strong>
            <span>
              {user.email}
            </span>
          </div>

          <span className="chevron">
            ⌄
          </span>
        </div>

        <button
          className="compose-button"
          onClick={() =>
            setComposeOpen(true)
          }
        >
          Compose
        </button>

        <div className="sidebar-section">
          <span className="section-label">
            CORE
          </span>

          <button
            className={`nav-item ${
              activeTab === "scheduled"
                ? "active"
                : ""
            }`}
            onClick={() =>
              setActiveTab(
                "scheduled"
              )
            }
          >
            <span>◷</span>
            <span>Scheduled</span>
            <span className="count">
              {scheduledEmails.length}
            </span>
          </button>

          <button
            className={`nav-item ${
              activeTab === "sent"
                ? "active"
                : ""
            }`}
            onClick={() =>
              setActiveTab("sent")
            }
          >
            <span>➤</span>
            <span>Sent</span>
            <span className="count">
              {sentEmails.length}
            </span>
          </button>
        </div>

        <button
          className="logout-button"
          onClick={handleLogout}
        >
          Logout
        </button>
      </aside>

      <main className="main-content">
        <div className="toolbar">
          <div className="search-box">
            <span>⌕</span>

            <input
              value={search}
              onChange={(e) =>
                setSearch(
                  e.target.value
                )
              }
              placeholder="Search"
            />
          </div>

          <button className="icon-button">
            ⚱
          </button>

          <button
            className="icon-button"
            onClick={fetchEmails}
          >
            ↻
          </button>
        </div>

        <div className="email-list">
          {loadingEmails ? (
            <div className="empty-state">
              <div className="spinner small" />
              <p>
                Loading emails...
              </p>
            </div>
          ) : filteredEmails.length ===
            0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                ✉
              </div>

              <h3>
                No{" "}
                {activeTab ===
                "scheduled"
                  ? "scheduled"
                  : "sent"}{" "}
                emails
              </h3>

              <p>
                {activeTab ===
                "scheduled"
                  ? "Your scheduled emails will appear here."
                  : "Emails you send will appear here."}
              </p>
            </div>
          ) : (
            filteredEmails.map(
              (email) => (
                <button
                  className="email-row"
                  key={email.id}
                  onClick={() =>
                    setSelectedEmail(
                      email
                    )
                  }
                >
                  <div className="email-main">
                    <strong>
                      To:{" "}
                      {email.recipient}
                    </strong>

                    <div className="email-subject">
                      <span
                        className={`status-pill ${
                          activeTab ===
                          "scheduled"
                            ? "scheduled-pill"
                            : "sent-pill"
                        }`}
                      >
                        {activeTab ===
                        "scheduled"
                          ? `◷ ${formatTime(
                              email.scheduledAt
                            )}`
                          : "Sent"}
                      </span>

                      <strong>
                        {email.subject}
                      </strong>

                      <span className="preview">
                        {" "}
                        -{" "}
                        {email.body
                          .replace(
                            /\s+/g,
                            " "
                          )
                          .slice(
                            0,
                            90
                          )}
                        {email.body
                          .length > 90
                          ? "..."
                          : ""}
                      </span>
                    </div>
                  </div>

                  <span className="star">
                    ☆
                  </span>
                </button>
              )
            )
          )}
        </div>
      </main>
    </div>
  );
}

function ComposePage({
  user,
  subject,
  body,
  recipients,
  startTime,
  delayBetweenEmails,
  hourlyLimit,
  showSchedulePanel,
  scheduleError,
  scheduleSuccess,
  scheduling,
  setSubject,
  setBody,
  setStartTime,
  setDelayBetweenEmails,
  setHourlyLimit,
  setShowSchedulePanel,
  handleCSV,
  setTomorrowAt,
  handleSchedule,
  closeCompose,
}: {
  user: User;
  subject: string;
  body: string;
  recipients: string[];
  startTime: string;
  delayBetweenEmails: number;
  hourlyLimit: number;
  showSchedulePanel: boolean;
  scheduleError: string;
  scheduleSuccess: string;
  scheduling: boolean;
  setSubject: (
    value: string
  ) => void;
  setBody: (
    value: string
  ) => void;
  setStartTime: (
    value: string
  ) => void;
  setDelayBetweenEmails: (
    value: number
  ) => void;
  setHourlyLimit: (
    value: number
  ) => void;
  setShowSchedulePanel: (
    value: boolean
  ) => void;
  handleCSV: (
    event: ChangeEvent<HTMLInputElement>
  ) => void;
  setTomorrowAt: (
    hour: number
  ) => void;
  handleSchedule: (
    event: FormEvent
  ) => void;
  closeCompose: () => void;
}) {
  return (
    <div className="compose-page">
      <form
        className="compose-container"
        onSubmit={handleSchedule}
      >
        <div className="compose-header">
          <button
            type="button"
            className="back-button"
            onClick={closeCompose}
          >
            ←
          </button>

          <h1>
            Compose New Email
          </h1>

          <div className="compose-actions">
            <span className="header-icon">
              ♧
            </span>

            <span className="header-icon">
              ◷
            </span>

            <button
              type="button"
              className="send-later-button"
              onClick={() =>
                setShowSchedulePanel(
                  !showSchedulePanel
                )
              }
            >
              {scheduling
                ? "Sending..."
                : "Send Later"}
            </button>
          </div>
        </div>

        <div className="compose-fields">
          <div className="field-row">
            <label>From</label>

            <div className="from-chip">
              {user.email}
              <span>⌄</span>
            </div>
          </div>

          <div className="field-row to-row">
            <label>To</label>

            <div className="recipient-area">
              {recipients.length ===
              0 ? (
                <span className="placeholder">
                  recipient@example.com
                </span>
              ) : (
                <div className="recipient-chips">
                  {recipients
                    .slice(0, 4)
                    .map(
                      (email) => (
                        <span
                          className="recipient-chip"
                          key={email}
                        >
                          {email}
                        </span>
                      )
                    )}

                  {recipients.length >
                    4 && (
                    <span className="recipient-chip more">
                      +
                      {recipients.length -
                        4}
                    </span>
                  )}
                </div>
              )}

              <label className="upload-list">
                ↑ Upload List
                <input
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleCSV}
                />
              </label>
            </div>
          </div>

          <div className="field-row">
            <label>
              Subject
            </label>

            <input
              className="line-input"
              value={subject}
              onChange={(e) =>
                setSubject(
                  e.target.value
                )
              }
              placeholder="Subject"
            />
          </div>

          <div className="limits-row">
            <label>
              Delay between 2 emails
            </label>

            <input
              type="number"
              min="0"
              value={
                delayBetweenEmails
              }
              onChange={(e) =>
                setDelayBetweenEmails(
                  Number(
                    e.target.value
                  )
                )
              }
            />

            <label>
              Hourly Limit
            </label>

            <input
              type="number"
              min="1"
              value={hourlyLimit}
              onChange={(e) =>
                setHourlyLimit(
                  Number(
                    e.target.value
                  )
                )
              }
            />
          </div>

          <div className="editor">
            <textarea
              value={body}
              onChange={(e) =>
                setBody(
                  e.target.value
                )
              }
              placeholder="Type Your Reply..."
            />

            <div className="editor-toolbar">
              <span>↶</span>
              <span>↷</span>
              <span>|</span>
              <span> Tᵀ</span>
              <span>|</span>
              <strong>B</strong>
              <em>I</em>
              <u>U</u>
              <span>|</span>
              <span>≡</span>
              <span>↕</span>
              <span>1≡</span>
              <span>•≡</span>
              <span>›≡</span>
              <span>‹≡</span>
              <span>❝</span>
              <span>▱</span>
              <span>S̶</span>
            </div>
          </div>

          {scheduleError && (
            <div className="form-error">
              {scheduleError}
            </div>
          )}

          {scheduleSuccess && (
            <div className="form-success">
              {scheduleSuccess}
            </div>
          )}
        </div>

        {showSchedulePanel && (
          <div className="schedule-panel">
            <h3>
              Send Later
            </h3>

            <label>
              Pick date & time
            </label>

            <input
              type="datetime-local"
              value={startTime}
              onChange={(e) =>
                setStartTime(
                  e.target.value
                )
              }
            />

            <div className="quick-times">
              <button
                type="button"
                onClick={() =>
                  setTomorrowAt(9)
                }
              >
                Tomorrow
              </button>

              <button
                type="button"
                onClick={() =>
                  setTomorrowAt(10)
                }
              >
                Tomorrow, 10:00 AM
              </button>

              <button
                type="button"
                onClick={() =>
                  setTomorrowAt(11)
                }
              >
                Tomorrow, 11:00 AM
              </button>

              <button
                type="button"
                onClick={() =>
                  setTomorrowAt(15)
                }
              >
                Tomorrow, 3:00 PM
              </button>
            </div>

            <div className="schedule-panel-actions">
              <button
                type="button"
                onClick={() =>
                  setShowSchedulePanel(
                    false
                  )
                }
              >
                Cancel
              </button>

              <button
                type="submit"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}

function EmailDetail({
  email,
  user,
  onBack,
}: {
  email: Email;
  user: User;
  onBack: () => void;
}) {
  const date =
    email.sentAt ||
    email.scheduledAt;

  return (
    <div className="detail-page">
      <div className="detail-header">
        <button
          className="back-button"
          onClick={onBack}
        >
          ←
        </button>

        <h1>
          {user.name}, hello there! |{" "}
          {email.subject}
        </h1>

        <div className="detail-actions">
          <span>☆</span>
          <span>▱</span>
          <span>♢</span>

          {user.avatar && (
            <img
              src={user.avatar}
              alt=""
            />
          )}
        </div>
      </div>

      <div className="message">
        <div className="sender-row">
          <div className="sender-avatar">
            {email.recipient
              .charAt(0)
              .toUpperCase()}
          </div>

          <div>
            <strong>
              ReachInbox
            </strong>

            <span>
              {" "}
              &lt;sender@example.com&gt;
            </span>

            <p>
              to me
            </p>
          </div>

          <time>
            {new Date(
              date
            ).toLocaleString()}
          </time>
        </div>

        <div className="message-body">
          {email.body
            .split("\n")
            .map(
              (
                paragraph,
                index
              ) => (
                <p
                  key={index}
                >
                  {paragraph}
                </p>
              )
            )}
        </div>
      </div>
    </div>
  );
}

function formatTime(
  value: string
) {
  return new Date(
    value
  ).toLocaleTimeString(
    [],
    {
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
    }
  );
}

export default App;