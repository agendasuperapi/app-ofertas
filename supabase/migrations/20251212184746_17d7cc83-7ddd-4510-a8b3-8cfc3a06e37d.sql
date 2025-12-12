-- Update ALL master users with complete permissions
UPDATE store_employees 
SET permissions = '{
  "orders": {
    "enabled": true,
    "view": true,
    "create": true,
    "view_all_orders": true,
    "view_pending_orders": true,
    "view_confirmed_orders": true,
    "view_preparing_orders": true,
    "view_ready_orders": true,
    "view_out_for_delivery_orders": true,
    "view_delivered_orders": true,
    "view_cancelled_orders": true,
    "edit_order_details": true,
    "add_order_notes": true,
    "view_order_history": true,
    "delete_order_items": true,
    "add_order_items": true,
    "export_orders": true,
    "mark_payment_received": true,
    "change_any_status": true,
    "change_status_confirmed": true,
    "change_status_preparing": true,
    "change_status_ready": true,
    "change_status_out_for_delivery": true,
    "change_status_delivered": true,
    "change_status_cancelled": true
  },
  "products": {
    "enabled": true,
    "view": true,
    "create": true,
    "update": true,
    "delete": true,
    "manage_stock": true,
    "manage_images": true
  },
  "categories": {
    "enabled": true,
    "view": true,
    "create": true,
    "update": true,
    "delete": true,
    "toggle_status": true
  },
  "delivery": {
    "enabled": true,
    "view": true,
    "create": true,
    "update": true,
    "delete": true
  },
  "coupons": {
    "enabled": true,
    "view": true,
    "create": true,
    "update": true,
    "delete": true,
    "toggle_status": true
  },
  "reports": {
    "enabled": true,
    "view": true,
    "export": true
  },
  "settings": {
    "enabled": true,
    "view": true,
    "update_store_info": true,
    "update_delivery_settings": true,
    "update_operating_hours": true
  },
  "whatsapp": {
    "enabled": true,
    "view": true,
    "edit": true
  },
  "affiliates": {
    "enabled": true,
    "view": true,
    "create": true,
    "update": true,
    "delete": true,
    "toggle_status": true,
    "view_commissions": true,
    "manage_commission_rules": true,
    "create_payments": true,
    "generate_invite_link": true,
    "view_reports": true
  }
}'::jsonb
WHERE position = 'Master' 
AND employee_email LIKE '%@ofertas.app';