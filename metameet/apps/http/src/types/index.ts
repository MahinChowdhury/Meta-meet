import z from "zod";

const signupSchema = z.object({
    username : z.string().email(),
    password : z.string().min(8),
    type: z.enum(["user","admin"]),
})