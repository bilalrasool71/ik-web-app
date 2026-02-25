
export class ApiResponseModel<ResModel> {
    Code: number | undefined;
    Message: string | undefined;
    Data: ResModel | undefined;
}

export class ApiOptionsModel<T> {
    RequestType: string | undefined;
    ParamObj?: T | null; //For post Request
    Repository: string | undefined;
    EndPoint: string | undefined;
    ReqQueryParams?: QueryParamsModel[]; //For Get Request
}

export class QueryParamsModel {
    constructor(Key: string, Value: any, IsDate: boolean = false) {
        this.Key = Key;
        this.Value = Value;
        this.IsDate = IsDate;
    }
    Key: string;
    Value: any;
    IsDate: boolean
}



export interface ApiResponse {
    Code: number;
    Message: string;
    Data: string;
}