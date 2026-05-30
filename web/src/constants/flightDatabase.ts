export interface FlightRecord {
  flightNumber: string;
  airline: string;
  from: string;
  to: string;
  departureTime: string;
  arrivalTime: string;
}

export const FLIGHT_DB: FlightRecord[] = [
  { flightNumber: "KE706",  airline: "Korean Air",         from: "NRT", to: "ICN", departureTime: "09:20", arrivalTime: "11:45" },
  { flightNumber: "OZ101",  airline: "Asiana Airlines",    from: "ICN", to: "NRT", departureTime: "09:00", arrivalTime: "11:30" },
  { flightNumber: "EK323",  airline: "Emirates",           from: "ICN", to: "DXB", departureTime: "23:50", arrivalTime: "05:30" },
  { flightNumber: "SQ601",  airline: "Singapore Airlines", from: "ICN", to: "SIN", departureTime: "09:00", arrivalTime: "14:50" },
  { flightNumber: "TK090",  airline: "Turkish Airlines",   from: "ICN", to: "IST", departureTime: "00:10", arrivalTime: "06:15" },
  { flightNumber: "QR857",  airline: "Qatar Airways",      from: "ICN", to: "DOH", departureTime: "22:30", arrivalTime: "04:00" },
  { flightNumber: "MH67",   airline: "Malaysia Airlines",  from: "ICN", to: "KUL", departureTime: "18:30", arrivalTime: "23:30" },
  { flightNumber: "EY872",  airline: "Etihad Airways",     from: "ICN", to: "AUH", departureTime: "22:00", arrivalTime: "03:55" },
  { flightNumber: "JL92",   airline: "Japan Airlines",     from: "ICN", to: "NRT", departureTime: "10:00", arrivalTime: "11:40" },
  { flightNumber: "CX417",  airline: "Cathay Pacific",     from: "ICN", to: "HKG", departureTime: "09:30", arrivalTime: "11:45" },
];
