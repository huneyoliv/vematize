package db

import (
	"time"
)

type Sale struct {
	ID                string                 `json:"id" db:"id"`
	ProductID         string                 `json:"productId" db:"productId"`
	UserID            string                 `json:"userId" db:"userId"`
	TelegramChatID    *int64                 `json:"telegramChatId,omitempty" db:"telegramChatId"`
	TelegramMessageID *int64                 `json:"telegramMessageId,omitempty" db:"telegramMessageId"`
	DiscordChannelID  *string                `json:"discordChannelId,omitempty" db:"discordChannelId"`
	DiscordMessageID  *string                `json:"discordMessageId,omitempty" db:"discordMessageId"`
	DiscordThreadID   *string                `json:"discordThreadId,omitempty" db:"discordThreadId"`
	Quantity          int                    `json:"quantity" db:"quantity"`
	TotalPrice        *float64               `json:"totalPrice" db:"totalPrice"`
	CouponCode        *string                `json:"couponCode,omitempty" db:"couponCode"`
	Status            string                 `json:"status" db:"status"`
	PaymentGateway    string                 `json:"paymentGateway" db:"paymentGateway"`
	WebhookVerified   bool                   `json:"webhookVerified" db:"webhookVerified"`
	ProviderVerified  bool                   `json:"providerVerified" db:"providerVerified"`
	PaymentDetails    map[string]interface{} `json:"paymentDetails" db:"paymentDetails"`
	CreatedAt         time.Time              `json:"createdAt" db:"createdAt"`
	UpdatedAt         *time.Time             `json:"updatedAt,omitempty" db:"updatedAt"`
}

type Settings struct {
	ID                   string                 `json:"id" db:"id"`
	LogoURL              *string                `json:"logoUrl,omitempty" db:"logoUrl"`
	PreferredPixGateway  *string                `json:"preferredPixGateway,omitempty" db:"preferredPixGateway"`
	PreferredCardGateway *string                `json:"preferredCardGateway,omitempty" db:"preferredCardGateway"`
	ActiveGateway        *string                `json:"activeGateway,omitempty" db:"activeGateway"`
	MercadoPagoConfig    map[string]interface{} `json:"mercadopagoConfig" db:"mercadopagoConfig"`
	EfiConfig            map[string]interface{} `json:"efiConfig" db:"efiConfig"`
	PushinpayConfig      map[string]interface{} `json:"pushinpayConfig" db:"pushinpayConfig"`
	CreatedAt            time.Time              `json:"createdAt" db:"createdAt"`
	UpdatedAt            *time.Time             `json:"updatedAt,omitempty" db:"updatedAt"`
}
