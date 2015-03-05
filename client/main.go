package main

import (
	"fmt"
	"gopkg.in/yaml.v2"
	"html/template"
	"io"
	"io/ioutil"
	"log"
	"net/http"
	"os"
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
	makeyaml()
	//readyaml()
	if Exist("data\\key.pub") {
		openbrowser("http://127.0.0.1")
	} else {
		openbrowser("http://127.0.0.1/static/template/createkey.html")
	}

	//设置访问的路由
	//web pages
	http.HandleFunc("/", welcome)
	http.HandleFunc("/com/", COMList)
	http.HandleFunc("/com/detail", COMDetail)
	http.HandleFunc("/com/new", NewCOM)
	http.HandleFunc("/cod", CODList)
	http.HandleFunc("/cod/detail", CODDetail)
	http.HandleFunc("/cod/new", NewCOD)
	http.HandleFunc("/asset/alloc", AssetAlloc)
	http.HandleFunc("/asset/exchange", AssetExchange)
	http.HandleFunc("/asset/reg", AssetReg)
	http.HandleFunc("/contract/reg", ContractReg)
	http.HandleFunc("/ticket/", TicketList)
	http.HandleFunc("/ticket/new", NewTicket)
	http.HandleFunc("/ticket/detail", TicketDetail)
	http.HandleFunc("/ticket/close", CloseTicket)

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

func readyaml() {
	hygbyte, _ := ioutil.ReadFile("data\\person.yaml")

	var hyg Person
	yaml.Unmarshal(hygbyte, &hyg)
	log.Print(hyg)

	d, _ := yaml.Marshal(&hyg)
	log.Printf("--- hyg:\n%s\n\n", string(d))

	indexbyte, _ := ioutil.ReadFile("data\\index.yaml")
	var index GlobalIndex
	yaml.Unmarshal(indexbyte, &index)
	log.Print(index)

	d, _ = yaml.Marshal(&index)
	log.Printf("--- index:\n%s\n\n", string(d))
}

func makeyaml() {
	hyg := Person{"Huang Yonggang", "modeler", "huangyg@mars22.com", "", "", `-----BEGIN PGP PUBLIC KEY BLOCK-----
Version: OpenPGP.js v0.9.0
Comment: http://openpgpjs.org

xsBNBFSlVgcBCACQURxJMfdrPbAFa5ZGOs4j43tRmc7KQoM6lKveobO+v+Jg
IIYqXtDadXAM1h34CQgwj4o7VFKf+M1SmGbO57cx+M3U1+SgKmW9w8gRwgNE
q+m3JPo+HIiOI/X8Gsa9vrbAbs19UvXk4H+CdC02bxwruLPan87fI17wGLEB
62mcLG9eNPg4XrmZDDISPvicR88AFmkZMPh9WoVm99jzKl3EWCfPXqdNiLWK
kzXZO2jPLXLb2iJRacq2i+QXt5UWB5BEaAHLLVLTu5PNykHumN0xxIoidrxV
G+ug8Z269ZmcYdRv2fgY/TYP+/h43RkSI+iqiXeKSL8+WGDqSpee9sPnABEB
AAHNMOa1i+ivlei0puWPtyAoaHlnL2pzLnNhbXBsZSkgPHRlc3RAanNzYW1w
bGUub3JnPsLAcgQQAQgAJgUCVKVWDwYLCQgHAwIJEE5QeumSjbLwBBUIAgoD
FgIBAhsDAh4BAADijgf/e24fcRYoEZlIrej5ZblOszkKV7Y2900NerwrLPFK
kfQVHOBSAi9Nls5rOlZ4jDi7rd8/V+NUDDqE966jMha6TpCnHd+j6I4tiJiq
I8n51FoctVcpJcadygcoZE18pGF+dl62o7iLJVqsQv6ZnbLTQJngPDjAQGG8
KKhJjpY2RYNnR8vBCb4+lH8lhBnXviUUyyFRBjbBdhiPVebvv/LGd60diEmJ
+xKC89+Z0bGdElPpVW2WdOkTXL47UoNfZpHzpxhytOmjAykxGFtaqtUmHzvN
KogM5YDXuO7ZcWjiiTbKSnLcYyWLBp8VGq+MdDQmIEV7YpE3/mWPHat0wZar
X87ATQRUpVYMAQgAogdxHIK2i4MMeV2DASacwP037GCqyLHRcmo1ud5IYkHd
WXs1xigEklj2+3AaWjYgHzhN/f5BE2aDFttSonJhQ+ltZrEArungIWppSfN+
v6SyzmUsYK8EooF1M/EckvyF3ugub+SGst4MXyGfYhx901oRvKhY61pFWgZP
3gs/P1nHbDpUYNDKENflVBV0ha2DSlLxFQdfSh4hh4Jm1icmw85V5gTwppQd
CQ//qGZ757Tq4AtZS9givMYnSkXFsSlufKZ8LTVa/RFZ+gGKbcJHMR8XLoOc
8n8Vge92GHm63W5mP33A99e+NgyegInLmoi3lIXGO8yORIdwci17Eaqa9QAR
AQABwsBfBBgBCAATBQJUpVYQCRBOUHrpko2y8AIbDAAAmiAIAIHhfGiJ9e9L
n8z9tD/BFzqk5vll36hCXkLdg2HzftJsxPdW0eT27iDLagJcsrbVpRAag49/
47GH9BeHdtqsDNsh7UzQAlfp4t7+Fi00+9GuazHtTnI1bN9zgpGLCCNP6JUR
J9Z00c+GhQayTkPwTCf9zCidtbbNJc7GRlfgOMaoNqGoasyZrltqoB6hCM16
l0jkh59MIqQ+4FbLQOqr/7SGi6H1wzFa/Q4Q9R2VDg5zlEg163pbsf+ope52
3rPxBia7vxpFfXQXGbtR6vZDjI8uqsEMEyflqiuHJxmjtitnYLRqxQRr9fZq
WMc+ZlpNrplXO9WkeuhEICGQdZSy/ok=
=+yKz
-----END PGP PUBLIC KEY BLOCK-----

`}
	CommCOM := COM{"通用 个人领域模型", "common", "github.com/hyg/ego/blob/master/common.com.md", NaturalPerson, "Huang Yonggang"}
	EgoCOM := COM{"ego 个人领域模型", "ego", "github.com/hyg/ego/blob/master/ego.com.md", NaturalPerson, "Huang Yonggang"}
	EgoCOD := COD{"ego 个人管理工具", "ego", EgoCOM, "github.com/hyg/ego/blob/master/cod.md", "ego.mars22.com/api", NaturalPerson, "Huang Yonggang"}

	//RMB := AssetType{"人民币", "RMB"}
	//Token := AssetType{"Token", "个人领域模型的内部记账单位。"}
	//Time1 := AssetType{"Time1", "1类时间:每天供应8小时。"}
	//Time2 := AssetType{"Time2", "2类时间;每天供应6小时。"}
	//Time3 := AssetType{"Time3", "3类时间:每天供应10小时。"}
	//COMFile := AssetType{"共同体模型", "COmmunity Model"}
	//CODFile := AssetType{"部署方案", "COmmunity Deployment"}
	raw := AssetPoolType{"raw", "原生资源池，是时间资源的注入池", NaturalPerson, "Huang Yonggang"}
	p1 := AssetPoolType{"p1", `登记：
	1. 不产生任何共同体定义的契约。
	2. 与第零层共同体的契约。`, NaturalPerson, "Huang Yonggang"}
	p2 := AssetPoolType{"p1", "登记：1. 产生共同体定义（即设计其数学模型）的行为，该模型要求成员公开接受角色。2. 产生共同体定义（即设计其数学模型）的契约，该模型要求成员公开接受角色。3. 与第零层以上共同体的契约，该共同体产生的模型要求成员公开接受角色。", NaturalPerson, "Huang Yonggang"}
	ia := AssetPoolType{"ia", "登记：1. 产生共同体定义（即设计其数学模型）的行为，该模型不要求成员公开接受角色。2. 产生共同体定义（即设计其数学模型）的契约，该模型不要求成员公开接受角色。3. 与第零层以上共同体的契约，该共同体产生的模型不要求成员公开接受角色。", NaturalPerson, "Huang Yonggang"}

	rawpool := AssetPool{"raw", map[string]float32{"RMB": 1.0, "Time1": 1.0, "Time2": 4.0, "Time3": 16.0}}
	p1pool := AssetPool{"p1", map[string]float32{"RMB": 1.0, "Time1": 4.0, "Time2": 4.0, "Time3": 4.0}}
	p2pool := AssetPool{"p1", map[string]float32{"RMB": 1.0, "Time1": 16.0, "Time2": 16.0, "Time3": 16.0}}
	iapool := AssetPool{"p1", map[string]float32{"RMB": 1.0, "Time1": 64.0, "Time2": 64.0, "Time3": 64.0}}

	client := EgoClient{hyg, EgoCOD, []AssetPool{rawpool, p1pool, p2pool, iapool}}
	index := GlobalIndex{[]PeriodBrief{{"201501010000", 0.0}, {"201501200000", 0.0}}, 6, []int{1, 2, 3, 4, 5, 6}, 1, []int{1}}

	egomodeling := Contract{2, "ego modeling", "p2", 2, "ego", "ego建模者", "2006-11-12 23:25:00", "2006-11-12 23:25:00", "", 2}
	tic := Ticket{1, 4, "基本管理制度", "启动S2状态", "2015-01-01 00:00:00", "2015-01-15 00:00:00", 2}
	ticbudget := TicketBudget{1, "p2", "Time1", 960, 15360}

	pi := PeriodIndex{3, 7, 2}
	bl := Baseline{"1.0", []AssetPool{rawpool, p1pool, p2pool, iapool}}

	d, err := yaml.Marshal(&hyg)
	checkErr(err)
	log.Printf("--- hyg:\n%s\n\n", string(d))

	d, _ = yaml.Marshal(&CommCOM)
	log.Printf("--- CommCOM:\n%s\n\n", string(d))
	d, _ = yaml.Marshal(&EgoCOM)
	log.Printf("--- EgoCOM:\n%s\n\n", string(d))
	d, _ = yaml.Marshal(&EgoCOD)
	log.Printf("--- EgoCOD:\n%s\n\n", string(d))

	d, _ = yaml.Marshal(&raw)
	log.Printf("--- raw:\n%s\n\n", string(d))
	d, _ = yaml.Marshal(&p1)
	log.Printf("--- p1:\n%s\n\n", string(d))
	d, _ = yaml.Marshal(&p2)
	log.Printf("--- p2:\n%s\n\n", string(d))
	d, _ = yaml.Marshal(&ia)
	log.Printf("--- ia:\n%s\n\n", string(d))

	d, _ = yaml.Marshal(&rawpool)
	log.Printf("--- rawpool:\n%s\n\n", string(d))
	d, _ = yaml.Marshal(&client)
	log.Printf("--- client:\n%s\n\n", string(d))

	d, _ = yaml.Marshal(&index)
	log.Printf("--- index:\n%s\n\n", string(d))

	d, _ = yaml.Marshal(&egomodeling)
	log.Printf("--- egomodeling:\n%s\n\n", string(d))
	d, _ = yaml.Marshal(&tic)
	log.Printf("--- tic:\n%s\n\n", string(d))
	d, _ = yaml.Marshal(&ticbudget)
	log.Printf("--- ticbudget:\n%s\n\n", string(d))

	d, _ = yaml.Marshal(&pi)
	log.Printf("--- periodindex:\n%s\n\n", string(d))
	d, _ = yaml.Marshal(&bl)
	log.Printf("--- baseline:\n%s\n\n", string(d))

}

func CopyFile(dstName, srcName string) (written int64, err error) {
	src, err := os.Open(srcName)
	if err != nil {
		return
	}
	defer src.Close()
	os.Remove(dstName)
	dst, err := os.OpenFile(dstName, os.O_WRONLY|os.O_CREATE, 0644)
	if err != nil {
		return
	}
	defer dst.Close()
	return io.Copy(dst, src)
}

// 检查文件或目录是否存在
// 如果由 filename 指定的文件或目录存在则返回 true，否则返回 false
func Exist(filename string) bool {
	_, err := os.Stat(filename)
	return err == nil || os.IsExist(err)
}
