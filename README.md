Beacon — City-Scale Emergency Response Platform

Distributed emergency response platform for Irish local authorities supporting real-time incident coordination, evacuation management, and AI-powered citizen assistance.

Designed using microservices and asynchronous event-driven communication to support scalability and fault isolation during high-traffic emergency scenarios.

━━━━━━━━━━━━━━━━━━

Architecture

• 6 Go microservices deployed on Google Kubernetes Engine (GKE)  
• React 18 + TypeScript web dashboard for incident commanders  
• Flutter mobile app for citizens and ground staff  
• GCP Pub/Sub (CloudEvents) for asynchronous event-driven communication  
• Apache Airflow ETL pipelines ingesting 13 Irish public data APIs  
• Vertex AI (Gemini Pro & Gemini Flash) for conversational AI, automated risk analysis, and distress detection  

━━━━━━━━━━━━━━━━━━

Deployment & Infrastructure

• Containerised using Docker (distroless images for minimal attack surface)  
• Deployed on Google Kubernetes Engine (GKE) with horizontal scaling support  
• Event-driven communication via GCP Pub/Sub using the CloudEvents model  
• GitHub Actions CI/CD pipelines for automated build, testing, and deployment  
• Secrets management using Kubernetes Secrets  
• Structured logging, monitoring, and health checks across services  

━━━━━━━━━━━━━━━━━━

Tech Stack

Backend  
Go • REST APIs • GCP Pub/Sub

Frontend  
React 18 • TypeScript

Mobile  
Flutter

Authentication  
Keycloak • OAuth2 • JWT • RBAC

Database  
PostgreSQL (CQRS) • Redis • ClickHouse

AI  
Google Vertex AI (Gemini Pro & Gemini Flash)

Infrastructure  
GKE • Docker • Kubernetes Secrets

ETL & Data  
Apache Airflow • 13 Irish public APIs

CI/CD  
GitHub Actions

━━━━━━━━━━━━━━━━━━

Key Features

• Real-time incident creation, dispatch, and status tracking  
• AI-powered citizen support bot with intelligent escalation and distress detection  
• Geographic evacuation zone broadcasting and emergency notifications  
• Live city data integration including traffic, weather, hospitals, and power grid information  
• Role-based access control for Citizens, Ground Staff, ERT Members, and Admins  
• Full audit trails and analytics pipeline powered by ClickHouse  

━━━━━━━━━━━━━━━━━━

My Contributions

• Built and integrated Go microservices for incident coordination and geographic data processing  
• Developed React/TypeScript dashboard interfaces for real-time incident monitoring and dispatch coordination  
• Integrated Vertex AI (Gemini Pro & Gemini Flash) for conversational citizen support, automated risk analysis, and distress detection  
• Designed and implemented Apache Airflow ETL pipelines ingesting 13 Irish public data APIs  
• Contributed to Kubernetes deployment configuration, CI/CD setup, and Kubernetes Secrets management  

━━━━━━━━━━━━━━━━━━

Team

Built as part of an MSc Computer Science (Future Networked Systems) group project at Trinity College Dublin (2025–2026).

━━━━━━━━━━━━━━━━━━

Author

Mansi Jaiswal  
Software Engineer | MSc Computer Science @ Trinity College Dublin

📍 Dublin, Ireland  
🔗 LinkedIn: https://linkedin.com/in/mansijaiswal  
🐙 GitHub: https://github.com/mjaiswal05  
📧 jaiswalmansi105@gmail.com
