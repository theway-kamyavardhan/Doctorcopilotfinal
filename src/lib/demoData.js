import { getLastLoginIdentifier } from "../services/api";

export const DEMO_PATIENT_IDENTIFIER = "P-10005";
export const DEMO_DOCTOR_IDENTIFIER = "D-10001";

function normalizeIdentifier(value) {
  return String(value || "").trim().toUpperCase();
}

export function isPatientDemoIdentifier(identifier) {
  return normalizeIdentifier(identifier) === DEMO_PATIENT_IDENTIFIER;
}

export function isDoctorDemoIdentifier(identifier) {
  return normalizeIdentifier(identifier) === DEMO_DOCTOR_IDENTIFIER;
}

export function getActiveDemoIdentifier() {
  return normalizeIdentifier(getLastLoginIdentifier());
}

const patientDemoDashboard = {
  profile: {
    id: 10005,
    patient_id: DEMO_PATIENT_IDENTIFIER,
    age: 29,
    gender: "Female",
    blood_group: "B+",
    phone_number: "+91 98765 43210",
    user: {
      full_name: "Demo Patient",
      email: "demo.patient@doctorcopilot.local",
    },
  },
  reports: [
    {
      id: 901,
      report_type: "Complete Blood Count",
      report_category: "hematology",
      report_date: "2026-03-18T09:00:00Z",
      created_at: "2026-03-18T09:05:00Z",
      lab_name: "Metro Diagnostics",
      summary: "Follow-up CBC with improving hemoglobin and stable platelet trend.",
      insights: [
        {
          title: "Mild anemia pattern improving",
          description: "Hemoglobin is still mildly low but trending upward compared with the previous report.",
        },
      ],
      parameters: [
        { name: "hemoglobin", value: "11.1", unit: "g/dL", status: "low" },
        { name: "platelets", value: "182000", unit: "/uL", status: "normal" },
        { name: "white_blood_cells", value: "6.7", unit: "x10^3/uL", status: "normal" },
        { name: "vitamin_b12", value: "248", unit: "pg/mL", status: "low" },
      ],
    },
    {
      id: 902,
      report_type: "Vitamin Panel",
      report_category: "nutrition",
      report_date: "2026-02-10T09:00:00Z",
      created_at: "2026-02-10T09:05:00Z",
      lab_name: "Metro Diagnostics",
      summary: "Micronutrient screening suggests low B12 reserve and borderline vitamin D.",
      insights: [
        {
          title: "Vitamin support recommended",
          description: "Vitamin B12 remains below the preferred range and should be reviewed with the treating clinician.",
        },
      ],
      parameters: [
        { name: "vitamin_b12", value: "212", unit: "pg/mL", status: "low" },
        { name: "vitamin_d", value: "24", unit: "ng/mL", status: "insufficient" },
        { name: "iron", value: "61", unit: "ug/dL", status: "normal" },
      ],
    },
  ],
  trends: {
    summary: [
      "Hemoglobin has improved slightly across the last two reports but remains below the ideal range.",
      "Vitamin B12 has remained low across repeated testing and may explain fatigue-related complaints.",
    ],
    anomalies: [
      {
        parameter: "vitamin_b12",
        severity: "warning",
        message: "Vitamin B12 has stayed low across multiple reports and should be followed up.",
      },
    ],
    metrics: {
      hemoglobin: { direction: "increasing", change: "+0.5 g/dL", stability: "recovering" },
      vitamin_b12: { direction: "stable", change: "+36 pg/mL", stability: "persistently low" },
      platelets: { direction: "stable", change: "+4000 /uL", stability: "within range" },
      white_blood_cells: { direction: "stable", change: "+0.2 x10^3/uL", stability: "within range" },
    },
    series: {
      hemoglobin: [
        { report_date: "2026-01-12T09:00:00Z", value: 10.4, unit: "g/dL", status: "low" },
        { report_date: "2026-02-10T09:00:00Z", value: 10.8, unit: "g/dL", status: "low" },
        { report_date: "2026-03-18T09:00:00Z", value: 11.1, unit: "g/dL", status: "low" },
      ],
      vitamin_b12: [
        { report_date: "2026-01-12T09:00:00Z", value: 198, unit: "pg/mL", status: "deficient" },
        { report_date: "2026-02-10T09:00:00Z", value: 212, unit: "pg/mL", status: "low" },
        { report_date: "2026-03-18T09:00:00Z", value: 248, unit: "pg/mL", status: "low" },
      ],
      platelets: [
        { report_date: "2026-01-12T09:00:00Z", value: 176000, unit: "/uL", status: "normal" },
        { report_date: "2026-02-10T09:00:00Z", value: 178000, unit: "/uL", status: "normal" },
        { report_date: "2026-03-18T09:00:00Z", value: 182000, unit: "/uL", status: "normal" },
      ],
      white_blood_cells: [
        { report_date: "2026-01-12T09:00:00Z", value: 6.4, unit: "x10^3/uL", status: "normal" },
        { report_date: "2026-02-10T09:00:00Z", value: 6.5, unit: "x10^3/uL", status: "normal" },
        { report_date: "2026-03-18T09:00:00Z", value: 6.7, unit: "x10^3/uL", status: "normal" },
      ],
    },
  },
  insights: {
    key_findings: [
      "Persistent low vitamin B12 across serial reports.",
      "Mild anemia pattern is improving but still not fully resolved.",
    ],
  },
  cases: [
    {
      id: 501,
      status: "open",
      description: "Fatigue and low B12 review with physician follow-up.",
      doctor_name: "Dr. Demo Consultant",
    },
  ],
  appointments: [
    {
      id: 301,
      case_id: 501,
      title: "Nutrition and hematology review",
      status: "scheduled",
      location: "Demo Center OPD",
      date_time: "2026-05-01T10:30:00Z",
      doctor_name: "Dr. Demo Consultant",
    },
  ],
};

const doctorDemoDashboard = {
  profile: {
    id: 10001,
    doctor_id: DEMO_DOCTOR_IDENTIFIER,
    specialization: "Internal Medicine",
    hospital: "DoctorCopilot Demo Diagnostics",
    user: {
      full_name: "Dr. Demo Physician",
      email: "demo.doctor@doctorcopilot.local",
    },
  },
  dashboard: {
    total_cases: 6,
    recent_report_count: 14,
  },
  cases: [
    {
      id: 601,
      status: "pending",
      description: "Persistent low vitamin B12 with fatigue complaints.",
      report_count: 2,
      patient: {
        id: 10005,
        patient_id: DEMO_PATIENT_IDENTIFIER,
        full_name: "Demo Patient",
        age: 29,
        gender: "Female",
        blood_group: "B+",
        phone_number: "+91 98765 43210",
      },
      reports: [
        {
          id: 901,
          report_type: "Complete Blood Count",
          report_category: "hematology",
          report_date: "2026-03-18T09:00:00Z",
          lab_name: "Metro Diagnostics",
          insights: [
            "Persistent low vitamin B12 with mild anemia recovery trend.",
          ],
        },
      ],
    },
    {
      id: 602,
      status: "open",
      description: "Diabetes medication review and trend follow-up.",
      report_count: 3,
      patient: {
        id: 10008,
        patient_id: "P-10008",
        full_name: "Rohan S.",
        age: 46,
        gender: "Male",
        blood_group: "O+",
        phone_number: "+91 99887 77665",
      },
      reports: [
        {
          id: 905,
          report_type: "HbA1c",
          report_category: "metabolic",
          report_date: "2026-03-11T09:00:00Z",
          lab_name: "City Labs",
          insights: [
            "HbA1c remains above target despite partial improvement.",
          ],
        },
      ],
    },
  ],
  appointments: [
    {
      id: 401,
      case_id: 602,
      patient_name: "Rohan S.",
      title: "Metabolic review follow-up",
      status: "scheduled",
      location: "Consult Room 2",
      date_time: "2026-05-02T08:30:00Z",
    },
    {
      id: 402,
      case_id: 601,
      patient_name: "Demo Patient",
      title: "CBC and nutrition review",
      status: "scheduled",
      location: "Consult Room 1",
      date_time: "2026-05-03T11:00:00Z",
    },
  ],
};

export function getPatientDemoDashboardSeed() {
  return isPatientDemoIdentifier(getActiveDemoIdentifier()) ? patientDemoDashboard : null;
}

export function getDoctorDemoDashboardSeed() {
  return isDoctorDemoIdentifier(getActiveDemoIdentifier()) ? doctorDemoDashboard : null;
}
