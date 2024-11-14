import { v4 } from "uuid";
import { ApiCollect, ApiFile, ApiMockDefine, ApiRequestDefine, ApiResponseDefine, DefaultHttpBody, HttpBody, KVField, Workspace } from "./base";
import axios, { Axios, AxiosError, AxiosResponse, AxiosResponseHeaders } from "axios";



export const DefaultHttpMockDefine: ApiMockDefine<HttpBody> = {
    collectId: "",
    id: "",
    name: "Unnamed",
    method: "GET",
    path: "/something",
    route_headers: [],
    route_params: [],
    mock_status: [{
        index: 0,
        key: "statusCode",
        value: "200"
    }, {
        index: 1,
        key: "statusText",
        value: "OK"
    }],
    mock_headers: [],
    mock_body: { ...DefaultHttpBody },
}


const baseURL = "/api"

export class ServerApi {

    private client: Axios

    constructor() {
        this.client = axios.create({
            baseURL: baseURL,
            timeout: 60000,
            withCredentials: false,
        })

        this.client.interceptors.response.use((response: AxiosResponse) => {
            return response.data
        }, (err: AxiosError) => {
            return err
        })
    }

    public async getWorkspaces(): Promise<Workspace[]> {
        return await this.client.get("/workspaces")
    }

    /**
     * 接口详情
     * @param id 
     * @returns 
     */
    public async getApiDefine(wid: string, id: string): Promise<ApiMockDefine<HttpBody>> {
        return await this.client.get("/define/" + id, { params: { workspaceId: wid } },)
    }


    /**
     * 接口集合
     * @param wid 
     * @returns 
     */
    public async getCollects(wid: string): Promise<ApiCollect<any>[]> {
        return this.client.get("/collections", { params: { workspaceId: wid } })
    }

    public async saveCollect(wid: string, collect: ApiCollect<any>): Promise<ApiCollect<any>> {
        return this.client.post("/collection?workspaceId=" + wid, collect)
    }

    public async updateCollect(wid: string, collect: ApiCollect<any>): Promise<ApiCollect<any>> {
        return this.client.put("/collection?workspaceId=" + wid, collect)
    }

    public async removeCollect(wid: string, collect: ApiCollect<any>) {
        return this.client.delete("/collection", { params: { workspaceId: wid, id: collect.id } })
    }


    public async saveApi(wid: string, data: ApiMockDefine<HttpBody>): Promise<string> {
        return this.client.post("/define", data, { params: { workspaceId: wid, } })
    }

    public async duplicateApi(wid: string, data: ApiMockDefine<any>) {

    }

    public async removeApi(wid: string, id: string): Promise<string> {
        return this.client.delete("/define/" + id, { params: { workspaceId: wid } })
    }


    public async fileset(): Promise<ApiFile[]> {
        const fileset = await this.client.get("/fileset") as ApiFile[]
        return fileset.map(e => {
            return { ...e, url: `/static/${e.name}` }
        })
    }

}


export class MockApi {

    private client: Axios

    constructor(workspace: Workspace) {
        this.client = axios.create({
            baseURL: workspace.endpoint,
            timeout: 60000,
            withCredentials: false,
        })
    }


    public async call(req: ApiRequestDefine<HttpBody>) {

        //only support form or raw
        const body = req.body.dataType === "form" ? this.toPartial(req.body.formValue) : req.body.rawValue;

        const callResp = await this.client.request({
            method: req.method,
            url: req.path,
            params: this.toPartial(req.parmaters),
            headers: this.toPartial(req.headers),
            data: body,
            responseType: "arraybuffer",
            validateStatus: () => { return true }
        })


        // header
        const respHeader = callResp.headers as AxiosResponseHeaders
        const headerFields: KVField[] = []
        for (const key in respHeader) {
            headerFields.push({
                index: 0,
                key: key,
                value: respHeader.get(key)?.toString() || ""
            })
        }

        const contentType = respHeader.getContentType!() as any
        const rawType = ["text", "xml", "json", "html"].filter(e => contentType?.indexOf(e) !== -1)[0] as any

        const resp: ApiResponseDefine<HttpBody> = {
            id: v4(),
            status: callResp.status,
            statusText: callResp.statusText,
            headers: headerFields,
            body: {
                dataType: rawType ? "raw" : "binary",

                rawType: rawType || "text",
                rawValue: rawType ? new TextDecoder('utf-8').decode(callResp.data) : "",

                binaryType: contentType,
                binaryValue: rawType ? new Uint8Array([]) : new Uint8Array(callResp.data),

                fileType: "remote",
                formType: "data",
                formValue: []
            }
        }
        return resp
    }



    private toPartial(fields: KVField[]): Partial<Record<string, string>> {
        const record: Partial<Record<string, string>> = {}
        fields.forEach(e => {
            record[e.key] = e.value
        })
        return record
    }
}