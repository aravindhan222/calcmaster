# CalcMaster 🔢

A professional, full-stack calculator web application built with **Java 17 + Spring Boot 3** (backend) and **HTML5/CSS3/Vanilla JavaScript** (frontend). Designed for laptop, tablet, and mobile screens.

---

## ✨ Features

| Module | Description |
|---|---|
| 🔢 Standard Calculator | Arithmetic, parentheses, percentage, memory (MS/MR/M+/M-/MC) |
| 🔬 Scientific Calculator | Trig, inverse trig, log, sqrt, factorial, constants (π, e), DEG/RAD mode |
| 💰 Financial Calculator | EMI, Compound Interest, Simple Interest with amortization charts |
| 📊 Statistics Calculator | Mean, Median, Mode, Variance, Std Dev, with data charts |
| 🔄 Unit Converter | Length, Mass, Temperature, Data storage |
| 📜 Calculation History | Persistent history, search, filter, reuse |
| 📦 Memory | Named memory slots (M1–M3) with MS/MR/M+/M-/MC |
| 📤 Export | Download history as CSV or PDF |
| ⚙️ Settings | Dark/light theme, decimal precision, angle units, number format |

---

## 🚀 Quick Start

### Prerequisites

- **Java 17+** — [Download OpenJDK 17](https://adoptium.net/)
- **Maven 3.8+** — [Download Maven](https://maven.apache.org/download.cgi)
- A modern browser (Chrome, Edge, Firefox, Safari)

Verify your installation:
```bash
java -version   # Should show 17 or higher
mvn -version    # Should show 3.8 or higher
```

---

### 1. Start the Backend

```bash
cd backend
mvn spring-boot:run
```

The backend starts on **http://localhost:8080**

You can verify it's running:
```
GET http://localhost:8080/api/health
```

H2 database console (dev only): http://localhost:8080/h2-console
- JDBC URL: `jdbc:h2:file:./calcmaster-db`
- User: `sa`, Password: (blank)

---

### 2. Open the Frontend

Simply open `frontend/index.html` in your browser:

```bash
# Windows
start frontend\index.html

# Or double-click frontend/index.html in File Explorer
```

> **Tip:** For best results, use VS Code with the **Live Server** extension and right-click `index.html` → "Open with Live Server" to avoid any CORS issues with file:// protocol.

---

## 🗂️ Project Structure

```
calcmaster/
├── backend/                    ← Spring Boot Java backend
│   ├── pom.xml                 ← Maven dependencies
│   └── src/
│       ├── main/java/com/calcmaster/
│       │   ├── CalcMasterApplication.java
│       │   ├── config/         ← CORS, JPA config
│       │   ├── controller/     ← REST API endpoints
│       │   ├── service/        ← Business logic
│       │   ├── parser/         ← Shunting-Yard expression parser
│       │   ├── engine/         ← BigDecimal calculation engine
│       │   ├── dto/            ← Request/Response DTOs
│       │   ├── entity/         ← JPA entities
│       │   ├── repository/     ← Spring Data JPA repos
│       │   └── exception/      ← Global exception handler
│       └── main/resources/
│           └── application.properties
├── frontend/                   ← HTML/CSS/JS frontend
│   ├── index.html              ← Single-page application
│   ├── css/style.css           ← Complete design system
│   ├── js/
│   │   ├── app.js              ← Main controller, navigation
│   │   ├── api.js              ← Backend API client
│   │   ├── calculator.js       ← Standard calculator
│   │   ├── scientific.js       ← Scientific calculator
│   │   ├── financial.js        ← Financial calculators + charts
│   │   ├── statistics.js       ← Statistics + charts
│   │   ├── converter.js        ← Unit converter
│   │   ├── history.js          ← Calculation history
│   │   ├── memory.js           ← Calculator memory
│   │   └── settings.js         ← App settings
│   ├── manifest.json           ← PWA manifest
│   └── sw.js                   ← Service worker
├── .gitignore
├── .env.example
└── README.md
```

---

## 🔌 REST API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Health check |
| `POST` | `/api/calculate` | Evaluate math expression |
| `POST` | `/api/scientific` | Scientific calculation |
| `POST` | `/api/financial/emi` | Loan EMI + amortization |
| `POST` | `/api/financial/compound-interest` | Compound interest |
| `POST` | `/api/financial/simple-interest` | Simple interest |
| `POST` | `/api/statistics` | Statistical analysis |
| `POST` | `/api/convert` | Unit conversion |
| `GET` | `/api/history` | Get calculation history |
| `DELETE` | `/api/history/{id}` | Delete one history item |
| `DELETE` | `/api/history` | Clear all history |
| `GET` | `/api/export/csv` | Download history as CSV |
| `GET` | `/api/export/pdf` | Download history as PDF |

### Sample API Requests

**Standard Calculation:**
```bash
curl -X POST http://localhost:8080/api/calculate \
  -H "Content-Type: application/json" \
  -d '{"expression": "2 + 3 * (4 - 1)", "degreesMode": true}'
```

**Scientific Calculation:**
```bash
curl -X POST http://localhost:8080/api/scientific \
  -H "Content-Type: application/json" \
  -d '{"expression": "sin(30) + cos(60)", "degreesMode": true}'
```

**EMI Calculation:**
```bash
curl -X POST http://localhost:8080/api/financial/emi \
  -H "Content-Type: application/json" \
  -d '{"principal": 500000, "annualRate": 8.5, "tenureMonths": 60, "currency": "INR"}'
```

**Statistics:**
```bash
curl -X POST http://localhost:8080/api/statistics \
  -H "Content-Type: application/json" \
  -d '{"data": [10, 20, 30, 20, 40, 50]}'
```

**Unit Conversion:**
```bash
curl -X POST http://localhost:8080/api/convert \
  -H "Content-Type: application/json" \
  -d '{"value": 100, "fromUnit": "km", "toUnit": "mile", "category": "LENGTH"}'
```

---

## 🧪 Running Tests

```bash
cd backend
mvn test
```

Tests cover:
- Expression parsing and evaluation
- Operator precedence and parentheses
- Decimal precision
- Scientific functions
- Financial formulas (EMI, compound interest)
- Statistical calculations
- Unit conversions
- Error handling (division by zero, invalid expressions)

---

## ⚙️ Configuration

### Development (H2 in-memory/file database)
Default configuration in `application.properties` uses H2. No setup required.

### Production (PostgreSQL)
Update `application.properties` or use environment variables:
```properties
spring.datasource.url=jdbc:postgresql://localhost:5432/calcmaster
spring.datasource.username=your_username
spring.datasource.password=your_password
spring.jpa.database-platform=org.hibernate.dialect.PostgreSQLDialect
spring.jpa.hibernate.ddl-auto=update
```

---

## 🎨 Themes

- **Dark Mode** (default): Navy/slate background with blue accents
- **Light Mode**: Clean white with blue accents

Toggle via the sun/moon button in the top-right or in Settings.

---

## 📱 Responsive Breakpoints

| Width | Layout |
|---|---|
| < 768px | Mobile: bottom tab nav, single column, large touch buttons |
| 768px–1024px | Tablet: compact sidebar nav |
| > 1024px | Desktop: full sidebar, side-by-side panels |

---

## 🔒 Security Notes

- All expressions are parsed by a custom Shunting-Yard algorithm — no `eval()` is used
- Server-side input validation on all endpoints
- SQL injection prevention via Spring Data JPA / Hibernate parameterized queries
- CORS configured for localhost development
- No sensitive data is stored

---

## 🛠️ Technology Stack

- **Backend**: Java 17, Spring Boot 3.3.2, Spring Data JPA, Hibernate, H2
- **Calculation Engine**: Java BigDecimal, MathContext.DECIMAL128
- **Expression Parser**: Custom Shunting-Yard algorithm + RPN evaluation
- **PDF Export**: Apache PDFBox 3.0.1
- **CSV Export**: Apache Commons CSV 1.10.0
- **Frontend**: HTML5, CSS3, Vanilla JavaScript ES6+
- **Charts**: Chart.js 4.x
- **Build**: Maven 3.8+
- **Testing**: JUnit 5, Mockito

---

## 📝 License

Built as an internship project. MIT License.

---

## 🤝 Author

CalcMaster — Professional Calculator Application  
Built with ❤️ using Java Spring Boot + Vanilla JavaScript
