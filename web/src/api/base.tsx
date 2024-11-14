export interface Workspace {
    
    id: string
    
    name: string

    endpoint: string
}

export interface KVField {

    index: number

    selected?: boolean

    key: string

    value: string

    description?: string
}

export interface ApiRequestDefine<T> {

    id: string

    name: string

    method: string

    // 路径
    path: string

    // 响应头
    headers: KVField[]

    //路径参数
    parmaters: KVField[]

    // 响应体
    body: T
}


export interface ApiResponseDefine<T> {

    id: string

    // 响应码 响应描述
    status:number

    statusText: string

    // 响应头
    headers: KVField[]

    // 响应体
    body: T
}


export interface ApiMockDefine<T> {

    collectId: string

    id: string

    name: string

    method: string

    // 路径
    path: string
    
    //路由请求头
    route_headers: KVField[]

    //路由请求参数
    route_params: KVField[]

    mock_status: KVField[]

    mock_headers: KVField[]

    mock_body: T
}





export type HttpBodyDataType = "none" | "file" | "raw" | "form" | "binary"


export interface HttpBody {

    dataType: HttpBodyDataType

    // 文件类型
    fileType: "remote" | "native"
    fileValue?: ApiFile

    //结构文本类型
    rawType: "json" | "text" | "xml" | "html"
    rawValue: string

    //表单类型
    formType: "urlencoded" | "data"
    formValue: KVField[]

    //二进制类型
    binaryType?: string
    binaryValue?: Uint8Array
}

export const DefaultHttpBody: HttpBody = {

    dataType: "raw",
    fileType: "remote",

    rawType: "json",
    rawValue: "{}",

    formType: "urlencoded",
    formValue: []
}



export interface ApiCollect<T> {

    id: string

    name: string

    paths: ApiMockDefine<T>[],
}


export interface ApiFile {

    path: string

    name: string

    url: string

    format: string
}