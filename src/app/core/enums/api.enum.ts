export enum RequestType {
    GET = "GET",
    POST = "POST",
    PUT = "PUT",
    PATCH = "PATCH",
    DELETE = "DELETE"
}


export enum Repository {
    Auth = "Auth/",
    Catalog = "Catalog/",
    StyleConfiguration = "StyleConfiguration/",
}

export enum EndPoints {

    //#region Auth
    Auth = "Auth",
    //#endregion

    //#region Catalog
    AllCustomers = "Customers",
    AllGenders = "Genders",
    AllProductTypes = "ProductTypes",
    AllProductSubTypes = "ProductSubTypes",
    AllSeasons = "Seasons",
    AddUpdateStyleConfigMain = "AddUpdateStyleConfigMain",
    //#endregion
}