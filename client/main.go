package main

import (
	"encoding/json"
	"fmt"
	"html/template"
	"log"
	"net/http"
	"os/exec"
	"runtime"
	"strings"
)

func welcome(w http.ResponseWriter, r *http.Request) {
	r.ParseForm() //解析参数，默认是不会解析的
	fmt.Println("method", r.Method)
	fmt.Println("path", r.URL.Path)

	for k, v := range r.Form {
		fmt.Println("key:", k)
		fmt.Println("val:", strings.Join(v, ""))
	}

	t, _ := template.ParseFiles("static/template/welcome.gtpl")
	t.Execute(w, nil)
}

func serveFile(pattern string, filename string) {
	http.HandleFunc(pattern, func(w http.ResponseWriter, req *http.Request) {
		http.ServeFile(w, req, filename)
	})
}

func main() {
	makejson()

	openbrowser("http://127.0.0.1")

	//设置访问的路由
	// web pages
	http.HandleFunc("/", welcome)

	// static files
	http.HandleFunc("/static/", func(w http.ResponseWriter, req *http.Request) {
		http.ServeFile(w, req, req.URL.Path[1:])
	})
	serveFile("/favicon.ico", "./favicon.ico")

	err := http.ListenAndServe(":80", nil) //设置监听的端口
	if err != nil {
		log.Fatal("ListenAndServe: ", err)
	}

}

func checkErr(err error) {
	if err != nil {
		panic(err)
	}
}

func openbrowser(url string) {
	var err error

	switch runtime.GOOS {
	case "linux":
		err = exec.Command("xdg-open", url).Start()
	case "windows":
		err = exec.Command("rundll32", "url.dll,FileProtocolHandler", url).Start()
	case "darwin":
		err = exec.Command("open", url).Start()
	default:
		err = fmt.Errorf("unsupported platform")
	}
	if err != nil {
		log.Fatal(err)
	}

}

func makejson() {
	hyg := Person{"Huang Yonggang", "modeler", "huangyg@mars22.com"}
	CommCOM := COM{"通用 个人领域模型", "https://github.com/hyg/ego/blob/master/common.com.md", Naturalperson, "Huang Yonggang"}
	EgoCOM := COM{"ego 个人领域模型", "https://github.com/hyg/ego/blob/master/ego.com.md", Naturalperson, "Huang Yonggang"}
	EgoCOD := COD{"egonet", EgoCOM, "https://github.com/hyg/ego/blob/master/cod.md", Naturalperson, "Huang Yonggang"}

	RMB := AssetType{"人民币", "RMB"}
	Token := AssetType{"Token", "个人领域模型的内部记账单位。"}
	Time1 := AssetType{"Time1", "1类时间:每天供应8小时。"}
	Time2 := AssetType{"Time2", "2类时间;每天供应6小时。"}
	Time3 := AssetType{"Time3", "3类时间:每天供应10小时。"}
	COMFile := AssetType{"共同体模型", "COmmunity Model"}
	CODFile := AssetType{"部署方案", "COmmunity Deployment"}
	raw := AssetPoolType{"raw", "原生资源池，是时间资源的注入池", Naturalperson, "Huang Yonggang"}
	p1 := AssetPoolType{"p1", "登记：1. 不产生任何共同体定义的契约。2. 与第零层共同体的契约。", Naturalperson, "Huang Yonggang"}
	p2 := AssetPoolType{"p1", "登记：1. 产生共同体定义（即设计其数学模型）的行为，该模型要求成员公开接受角色。2. 产生共同体定义（即设计其数学模型）的契约，该模型要求成员公开接受角色。3. 与第零层以上共同体的契约，该共同体产生的模型要求成员公开接受角色。", Naturalperson, "Huang Yonggang"}
	ia := AssetPoolType{"ia", "登记：1. 产生共同体定义（即设计其数学模型）的行为，该模型不要求成员公开接受角色。2. 产生共同体定义（即设计其数学模型）的契约，该模型不要求成员公开接受角色。3. 与第零层以上共同体的契约，该共同体产生的模型不要求成员公开接受角色。", Naturalperson, "Huang Yonggang"}

	rawpool := AssetPool{"raw", map[string]float32{"RMB": 1.0, "Time1": 1.0, "Time2": 4.0, "Time3": 16.0}}
	p1pool := AssetPool{"p1", map[string]float32{"RMB": 1.0, "Time1": 4.0, "Time2": 4.0, "Time3": 4.0}}
	p2pool := AssetPool{"p1", map[string]float32{"RMB": 1.0, "Time1": 16.0, "Time2": 16.0, "Time3": 16.0}}
	iapool := AssetPool{"p1", map[string]float32{"RMB": 1.0, "Time1": 64.0, "Time2": 64.0, "Time3": 64.0}}

	client := EgoClient{hyg, EgoCOD, []AssetPool{rawpool, p1pool, p2pool, iapool}}

	jsonbyte, _ := json.Marshal(hyg)
	log.Print(string(jsonbyte))

	jsonbyte, _ = json.Marshal(CommCOM)
	log.Print(string(jsonbyte))
	jsonbyte, _ = json.Marshal(EgoCOM)
	log.Print(string(jsonbyte))
	jsonbyte, _ = json.Marshal(EgoCOD)
	log.Print(string(jsonbyte))
	jsonbyte, _ = json.Marshal(RMB)
	log.Print(string(jsonbyte))
	jsonbyte, _ = json.Marshal(Token)
	log.Print(string(jsonbyte))
	jsonbyte, _ = json.Marshal(Time1)
	log.Print(string(jsonbyte))
	jsonbyte, _ = json.Marshal(Time2)
	log.Print(string(jsonbyte))
	jsonbyte, _ = json.Marshal(Time3)
	log.Print(string(jsonbyte))
	jsonbyte, _ = json.Marshal(COMFile)
	log.Print(string(jsonbyte))
	jsonbyte, _ = json.Marshal(CODFile)
	log.Print(string(jsonbyte))

	jsonbyte, _ = json.Marshal(raw)
	log.Print(string(jsonbyte))
	jsonbyte, _ = json.Marshal(p1)
	log.Print(string(jsonbyte))
	jsonbyte, _ = json.Marshal(p2)
	log.Print(string(jsonbyte))
	jsonbyte, _ = json.Marshal(ia)
	log.Print(string(jsonbyte))

	jsonbyte, _ = json.Marshal(rawpool)
	log.Print(string(jsonbyte))
	jsonbyte, _ = json.Marshal(p1pool)
	log.Print(string(jsonbyte))
	jsonbyte, _ = json.Marshal(p2pool)
	log.Print(string(jsonbyte))
	jsonbyte, _ = json.Marshal(iapool)
	log.Print(string(jsonbyte))

	jsonbyte, _ = json.Marshal(client)
	log.Print(string(jsonbyte))
}
