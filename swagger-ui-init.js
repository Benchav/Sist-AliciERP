
window.onload = function() {
  // Build a system
  var url = window.location.search.match(/url=([^&]+)/);
  if (url && url.length > 1) {
    url = decodeURIComponent(url[1]);
  } else {
    url = window.location.origin;
  }
  var options = {
  "swaggerDoc": {
    "openapi": "3.0.3",
    "info": {
      "title": "SIST-ALICI ERP",
      "version": "1.0.0",
      "description": "API REST in-memory para la gestión del ERP de Panadería SIST-ALICI"
    },
    "servers": [
      {
        "url": "http://localhost:3000",
        "description": "Servidor principal"
      }
    ],
    "components": {
      "securitySchemes": {
        "bearerAuth": {
          "type": "http",
          "scheme": "bearer",
          "bearerFormat": "JWT"
        }
      },
      "schemas": {
        "Identifiable": {
          "type": "object",
          "properties": {
            "id": {
              "type": "string",
              "example": "INS-HAR-50KG"
            }
          }
        },
        "SystemConfig": {
          "type": "object",
          "properties": {
            "tasaCambio": {
              "type": "number",
              "example": 36.6
            }
          }
        },
        "Insumo": {
          "allOf": [
            {
              "$ref": "#/components/schemas/Identifiable"
            },
            {
              "type": "object",
              "properties": {
                "nombre": {
                  "type": "string"
                },
                "unidad": {
                  "type": "string",
                  "example": "saco"
                },
                "stock": {
                  "type": "number",
                  "format": "double"
                },
                "costoPromedio": {
                  "type": "number",
                  "format": "double"
                }
              }
            }
          ]
        },
        "InsumoRequest": {
          "type": "object",
          "required": [
            "nombre",
            "unidad"
          ],
          "properties": {
            "nombre": {
              "type": "string",
              "example": "Harina integral"
            },
            "unidad": {
              "type": "string",
              "example": "kg"
            },
            "stock": {
              "type": "number",
              "example": 20
            },
            "costoPromedio": {
              "type": "number",
              "example": 550
            }
          }
        },
        "InsumoUpdateRequest": {
          "allOf": [
            {
              "$ref": "#/components/schemas/InsumoRequest"
            }
          ]
        },
        "InsumoResponse": {
          "type": "object",
          "properties": {
            "data": {
              "$ref": "#/components/schemas/Insumo"
            }
          }
        },
        "PurchaseRequest": {
          "type": "object",
          "required": [
            "insumoId",
            "cantidad",
            "costoTotal"
          ],
          "properties": {
            "insumoId": {
              "type": "string"
            },
            "cantidad": {
              "type": "number",
              "example": 10
            },
            "costoTotal": {
              "type": "number",
              "example": 500
            }
          }
        },
        "PurchaseResponse": {
          "type": "object",
          "properties": {
            "data": {
              "$ref": "#/components/schemas/Insumo"
            }
          }
        },
        "InsumoListResponse": {
          "type": "object",
          "properties": {
            "data": {
              "type": "array",
              "items": {
                "$ref": "#/components/schemas/Insumo"
              }
            }
          }
        },
        "RecetaItem": {
          "type": "object",
          "properties": {
            "insumoId": {
              "type": "string"
            },
            "cantidad": {
              "type": "number"
            }
          }
        },
        "Receta": {
          "allOf": [
            {
              "$ref": "#/components/schemas/Identifiable"
            },
            {
              "type": "object",
              "properties": {
                "productoId": {
                  "type": "string"
                },
                "costoManoObra": {
                  "type": "number"
                },
                "items": {
                  "type": "array",
                  "items": {
                    "$ref": "#/components/schemas/RecetaItem"
                  }
                }
              }
            }
          ]
        },
        "RecetaListResponse": {
          "type": "object",
          "properties": {
            "data": {
              "type": "array",
              "items": {
                "$ref": "#/components/schemas/Receta"
              }
            }
          }
        },
        "RecetaResponse": {
          "type": "object",
          "properties": {
            "data": {
              "$ref": "#/components/schemas/Receta"
            }
          }
        },
        "ProductionRequest": {
          "type": "object",
          "required": [
            "recetaId",
            "cantidad"
          ],
          "properties": {
            "recetaId": {
              "type": "string"
            },
            "cantidad": {
              "type": "integer",
              "example": 5
            }
          }
        },
        "ProductionResponse": {
          "type": "object",
          "properties": {
            "data": {
              "type": "object",
              "properties": {
                "id": {
                  "type": "string"
                },
                "recetaId": {
                  "type": "string"
                },
                "productoId": {
                  "type": "string"
                },
                "cantidadProducida": {
                  "type": "integer"
                },
                "costoIngredientes": {
                  "type": "number"
                },
                "costoManoObra": {
                  "type": "number"
                },
                "costoTotal": {
                  "type": "number"
                },
                "fecha": {
                  "type": "string",
                  "format": "date-time"
                }
              }
            }
          }
        },
        "Producto": {
          "allOf": [
            {
              "$ref": "#/components/schemas/Identifiable"
            },
            {
              "type": "object",
              "properties": {
                "nombre": {
                  "type": "string"
                },
                "stockDisponible": {
                  "type": "number"
                },
                "precioUnitario": {
                  "type": "number"
                },
                "precioVenta": {
                  "type": "number"
                }
              }
            }
          ]
        },
        "CrearProductoRequest": {
          "type": "object",
          "required": [
            "nombre"
          ],
          "properties": {
            "nombre": {
              "type": "string"
            },
            "stockDisponible": {
              "type": "number"
            },
            "precioUnitario": {
              "type": "number"
            },
            "precioVenta": {
              "type": "number"
            }
          }
        },
        "ActualizarProductoRequest": {
          "allOf": [
            {
              "$ref": "#/components/schemas/CrearProductoRequest"
            }
          ]
        },
        "ProductoResponse": {
          "type": "object",
          "properties": {
            "data": {
              "$ref": "#/components/schemas/Producto"
            }
          }
        },
        "ProductoListResponse": {
          "type": "object",
          "properties": {
            "data": {
              "type": "array",
              "items": {
                "$ref": "#/components/schemas/Producto"
              }
            }
          }
        },
        "UpsertRecetaRequest": {
          "type": "object",
          "required": [
            "productoId",
            "items"
          ],
          "properties": {
            "id": {
              "type": "string",
              "nullable": true
            },
            "productoId": {
              "type": "string"
            },
            "costoManoObra": {
              "type": "number"
            },
            "items": {
              "type": "array",
              "items": {
                "$ref": "#/components/schemas/RecetaItem"
              }
            }
          }
        },
        "VentaItem": {
          "type": "object",
          "properties": {
            "productoId": {
              "type": "string"
            },
            "cantidad": {
              "type": "integer"
            },
            "precioUnitario": {
              "type": "number"
            }
          }
        },
        "DetallePago": {
          "type": "object",
          "properties": {
            "moneda": {
              "type": "string",
              "example": "NIO"
            },
            "cantidad": {
              "type": "number"
            },
            "tasa": {
              "type": "number",
              "nullable": true
            }
          }
        },
        "Venta": {
          "allOf": [
            {
              "$ref": "#/components/schemas/Identifiable"
            },
            {
              "type": "object",
              "properties": {
                "totalNIO": {
                  "type": "number"
                },
                "pagos": {
                  "type": "array",
                  "items": {
                    "$ref": "#/components/schemas/DetallePago"
                  }
                },
                "items": {
                  "type": "array",
                  "items": {
                    "$ref": "#/components/schemas/VentaItem"
                  }
                },
                "fecha": {
                  "type": "string",
                  "format": "date-time"
                }
              }
            }
          ]
        },
        "SalesCheckoutRequest": {
          "type": "object",
          "required": [
            "items",
            "pagos"
          ],
          "properties": {
            "items": {
              "type": "array",
              "items": {
                "type": "object",
                "required": [
                  "productoId",
                  "cantidad"
                ],
                "properties": {
                  "productoId": {
                    "type": "string"
                  },
                  "cantidad": {
                    "type": "integer"
                  }
                }
              }
            },
            "pagos": {
              "type": "array",
              "items": {
                "$ref": "#/components/schemas/DetallePago"
              }
            }
          }
        },
        "SalesCheckoutResponse": {
          "type": "object",
          "properties": {
            "data": {
              "$ref": "#/components/schemas/Venta"
            },
            "cambio": {
              "type": "number"
            }
          }
        },
        "SalesHistoryResponse": {
          "type": "object",
          "properties": {
            "data": {
              "type": "array",
              "items": {
                "$ref": "#/components/schemas/Venta"
              }
            }
          }
        },
        "SalesDetailResponse": {
          "type": "object",
          "properties": {
            "data": {
              "$ref": "#/components/schemas/Venta"
            }
          }
        },
        "ErrorResponse": {
          "type": "object",
          "properties": {
            "error": {
              "type": "string"
            },
            "details": {
              "type": "object",
              "nullable": true
            }
          }
        },
        "UserSummary": {
          "type": "object",
          "properties": {
            "id": {
              "type": "string"
            },
            "nombre": {
              "type": "string"
            },
            "username": {
              "type": "string"
            },
            "rol": {
              "type": "string",
              "enum": [
                "ADMIN",
                "PANADERO",
                "CAJERO"
              ]
            }
          }
        },
        "AuthLoginRequest": {
          "type": "object",
          "required": [
            "username",
            "password"
          ],
          "properties": {
            "username": {
              "type": "string",
              "example": "admin"
            },
            "password": {
              "type": "string",
              "example": "123456"
            }
          }
        },
        "AuthLoginResponse": {
          "type": "object",
          "properties": {
            "token": {
              "type": "string"
            },
            "user": {
              "$ref": "#/components/schemas/UserSummary"
            }
          }
        },
        "AuthRegisterRequest": {
          "type": "object",
          "required": [
            "username",
            "nombre",
            "password",
            "rol"
          ],
          "properties": {
            "username": {
              "type": "string"
            },
            "nombre": {
              "type": "string"
            },
            "password": {
              "type": "string"
            },
            "rol": {
              "type": "string",
              "enum": [
                "ADMIN",
                "PANADERO",
                "CAJERO"
              ]
            }
          }
        },
        "AuthUserResponse": {
          "type": "object",
          "properties": {
            "data": {
              "$ref": "#/components/schemas/UserSummary"
            }
          }
        },
        "AuthUserListResponse": {
          "type": "object",
          "properties": {
            "data": {
              "type": "array",
              "items": {
                "$ref": "#/components/schemas/UserSummary"
              }
            }
          }
        }
      }
    },
    "paths": {},
    "tags": []
  },
  "customOptions": {}
};
  url = options.swaggerUrl || url
  var urls = options.swaggerUrls
  var customOptions = options.customOptions
  var spec1 = options.swaggerDoc
  var swaggerOptions = {
    spec: spec1,
    url: url,
    urls: urls,
    dom_id: '#swagger-ui',
    deepLinking: true,
    presets: [
      SwaggerUIBundle.presets.apis,
      SwaggerUIStandalonePreset
    ],
    plugins: [
      SwaggerUIBundle.plugins.DownloadUrl
    ],
    layout: "StandaloneLayout"
  }
  for (var attrname in customOptions) {
    swaggerOptions[attrname] = customOptions[attrname];
  }
  var ui = SwaggerUIBundle(swaggerOptions)

  if (customOptions.oauth) {
    ui.initOAuth(customOptions.oauth)
  }

  if (customOptions.preauthorizeApiKey) {
    const key = customOptions.preauthorizeApiKey.authDefinitionKey;
    const value = customOptions.preauthorizeApiKey.apiKeyValue;
    if (!!key && !!value) {
      const pid = setInterval(() => {
        const authorized = ui.preauthorizeApiKey(key, value);
        if(!!authorized) clearInterval(pid);
      }, 500)

    }
  }

  if (customOptions.authAction) {
    ui.authActions.authorize(customOptions.authAction)
  }

  window.ui = ui
}
