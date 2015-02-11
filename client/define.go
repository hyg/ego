package main

type GlobalIndex struct {
	Period      []PeriodBrief
	ContractMax int
	Contract    []int
	TicketMax   int
	Ticket      []int
}

type PeriodIndex struct {
	IncomeMax   int
	PayMax      int
	ExchangeMax int
}

type PeriodBrief struct {
	BeingTime    string
	TotalBalance float32
}

type Baseline struct {
	Version string
	Pool    []AssetPool
}

type Exchange struct {
	PoolName1    string
	AssetType1   string
	Amount1      float32
	PoolName2    string
	AssetType2   string
	Amount2      float32
	TokenAmount  float32
	ExchangeTime string
	Log          string
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
	Log         string
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
	Log         string
	Param1      string
	Param2      string
}

type TicketBudget struct {
	TicketID    int
	PoolName    string
	AssetType   string
	Amount      float32
	TokenAmount float32
}

type Ticket struct {
	TicketID   int
	ContractID int
	Target     string
	Content    string
	CreateTime string
	Deadline   string
	Status     int
}

//
type Contract struct {
	ContractID     int
	Title          string
	PoolName       string
	OtherPartyType int
	OtherPartyName string
	Content        string
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

// pub only
// [CreatorName].[Name].assetpooltype.json
type AssetPoolType struct {
	Name        string
	Define      string
	CreatorType int
	CreatorName string
}

// local only
type AssetType struct {
	Name   string
	Define string
}

// pub only
// [CreatorName].[Name].com.json
type COM struct {
	Name        string
	NickName    string
	PubURL      string
	CreatorType int
	CreatorName string
}

//COD 是一个利益共同体部署。
//部署方案作为一种信息资产，叫CODFile。
// pub only
// [DeployerName].[Name].cod.json
type COD struct {
	Name         string
	NickName     string
	Model        COM
	PubURL       string
	APIURL       string
	DeployerType int
	DeployerName string
}

// pub only
// [NickName].person.json
type Person struct {
	Name      string
	NickName  string // global unique
	Email     string
	DataURL   string
	Statement string
	Pubkey    string
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

const version = "0.1"
