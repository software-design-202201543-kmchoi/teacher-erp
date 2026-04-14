import type { AppAbility } from "@teacher-erp/shared-utils"
import type { IUser } from "@teacher-erp/shared-types"

declare global {
  namespace Express {
    interface Request {
      authUser?: IUser
      ability?: AppAbility
    }
  }
}

export {}