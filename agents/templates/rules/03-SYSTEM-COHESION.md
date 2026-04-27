# 03 — Cohesion & Architecture Patterns

<!-- 
  DEEP EXPERT CONSENSUS (2025/2026)
  Rules for preventing the distributed monolith and maintaining strict decoupling
  using the latest contract-first testing and flow patterns.
-->

## 1. Consumer-Driven Contract Testing (CDCT)

The era of brittle, slow E2E GUI testing to verify component cohesion is over.
- **Pact / Contract Verification:** Cross-service integration (Frontend ↔ Backend, or Microservice ↔ Microservice) must be verified via explicit Contracts. The frontend defines exact shape expectations (the "pact"); the backend CI/CD pipeline automatically fails if those shapes change. 
- **Code Generation Only:** Manual writing of API request functions on the frontend is banned. Use tools to generate TypeScript clients directly from the OpenAPI / GraphQL SDL contract.

## 2. Managing Distributed Consistency 

No two microservices or bounded contexts may share the same database tables. 
- **Saga Pattern (Eventual Consistency):** If a business feature spans multiple services (e.g., Inventory + Payment), standard SQL ACID commits cannot span them. Implement the Saga pattern. 
- **Compensating Transactions:** Every step forward must have a programmed "compensating" backwards step (an undo command). If Payment fails, the Saga must physically broadcast an event to explicitly rollback the Inventory lock. 
- **Orchestration vs Choreography:** For complex flows > 3 steps, use a central workflow Orchestrator (like Temporal or AWS Step Functions) rather than messy event choreography where services blindly emit events.

## 3. Target Delivery via BFF

- **Backend For Frontend (BFF):** Do not force specific client UIs (Web Dashboard vs Mobile vs Agent) to filter or format massive generalized API payloads. 
- Build a dedicated, lightweight BFF layer for the web frontend that orchestrates and aggregates downstream microservice data, delivering only the precise JSON shape necessary for the React components to render without local mutations.
