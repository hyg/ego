package main

type exchange struct {
	PoolName1    string
	AssetType1   string
	Amount1      float32
	PoolName2    string
	AssetType2   string
	Amount2      float32
	TokenAmount  float32
	ExchangeTime string
	PubLog       string
	LocalLog     string
	Param1       string
	Param2       string
}

type Pay struct {
	ContractID  int
	TicketID    int
	PoolName    string
	AssetType   string
	Amount      float32
	TokenAmount float32
	PayTime     string
	PubLog      string
	LocalLog    string
	Param1      string
	Param2      string
}

type Income struct {
	ContractID  int
	TicketID    int
	PoolName    string
	AssetType   string
	Amount      float32
	TokenAmount float32
	IncomeTime  string
	PubLog      string
	LocalLog    string
	Param1      string
	Param2      string
}

type TicketBudget struct {
	ContractID  int
	TicketID    int
	PoolName    string
	AssetType   string
	Amount      float32
	TokenAmount float32
}

type Ticket struct {
	TicketID     int
	ContractID   int
	Target       string
	PubContent   string
	LocalContent string
	CreateTime   string
	Deadline     string
	Status       int
}

type Contract struct {
	ContractID     int
	PoolName       string
	OtherPartyType int
	OtherPartyName string
	PubContent     string
	LocalContent   string
	SignTime       string
	ValidTime      string
	InvalidTime    string
	Status         int
}

type EgoClient struct {
	Owner               Person
	CommunityDeployment COD
	PoolList            []AssetPool
}

type AssetPool struct {
	PoolTypeName string
	Price        map[string]float32
}

type AssetPoolType struct {
	Name        string
	Define      string
	CreatorType int
	CreatorName string
}

type AssetType struct {
	Name   string
	Define string
}

type COM struct {
	Name        string
	PubURL      string
	CreatorType int
	CreatorName string
}

//COD 是一个利益共同体部署。
//部署方案作为一种信息资产，叫CODFile。
type COD struct {
	Name         string
	Model        COM
	PubURL       string
	DeployerType int
	DeployerName string
}

type Person struct {
	Name     string
	NickName string
	Email    string
}

const (
	NaturalPerson = 1 << iota // 1 (i.e. 1 << 0)
	VirtualPerson             // 2 (i.e. 1 << 1)
)

//contract status
const (
	Offer   = 1 << iota // 1 (i.e. 1 << 0)
	Valid               // 2 (i.e. 1 << 1)
	Invalid             // 4
)

//ticket status
const (
	Open  = 1 << iota // 1 (i.e. 1 << 0)
	Close             // 2 (i.e. 1 << 1)
)
