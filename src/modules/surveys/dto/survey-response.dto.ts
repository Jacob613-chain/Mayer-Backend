export interface SurveyResponseData {
    has_hoa: string;
    has_wifi: string;
    rep_name: string;
    has_attic: string;
    roof_type: string;
    panel_year: string;
    description: string;
    // ... add other fields as needed
  }
  
  export interface Survey {
    id: number;
    customer_name: string;
    customer_address: string;
    rep_name: string;
    created_at: Date;
    response_data: SurveyResponseData;
  }