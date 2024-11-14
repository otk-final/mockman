package api

type Collection struct {
	Id    string    `json:"id,omitempty"`
	Name  string    `json:"name,omitempty"`
	Paths []*Define `json:"paths"`
}

// Define 接口定义
type Define struct {
	CollectId    string        `json:"collectId"`
	Id           string        `json:"id"`
	Name         string        `json:"name"`
	Method       string        `json:"method"`
	Path         string        `json:"path"`
	RouteHeaders KVFields      `json:"route_headers"`
	RouteParams  KVFields      `json:"route_params"`
	MockStatus   KVFields      `json:"mock_status"`
	MockHeaders  KVFields      `json:"mock_headers"`
	MockBody     *ResponseBody `json:"mock_body"`
}

// ResponseBody 响应体
type ResponseBody struct {

	//数据格式
	DataType string `json:"dataType,omitempty"`

	//文件
	FileType  string `json:"fileType,omitempty"`
	FileValue *File  `json:"fileValue,omitempty"`

	//结构化数据
	RawType  string `json:"rawType,omitempty"`
	RawValue string `json:"rawValue,omitempty"`

	//表单数据
	FormType  string   `json:"formType,omitempty"`
	FormValue KVFields `json:"formValue,omitempty"`
}
