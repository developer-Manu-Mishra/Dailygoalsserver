import { User } from "../models/users.js";
import { sendMail } from "../utils/sendMail.js";
import { sendToken } from "../utils/sendToken.js";
import cloudinary from "cloudinary";
import fs from "fs";

export const register = async (req, res, next) => {

    try {


        const { name, email, password } = req.body;
        const avatar = req.files.avatar.tempFilePath;




        let user = await User.findOne({ email });

        if (user) {
            return res.status(400).json({ success: false, message: "User Already Exists" });
        }

        // const otp = Math.floor(Math.random() * 1000000)

        const otp = 123456;

        const myUpLoad = await cloudinary.v2.uploader.upload(avatar, {
            folder: "profile",
        });

        fs.rmSync("./tmp", { recursive: true });

        user = await User.create({
            name, email, password, avatar: {
                public_id: myUpLoad.public_id,
                url: myUpLoad.secure_url,
            }, otp, otp_expiry: new Date(Date.now() + process.env.OTP_EXPIRE * 60 * 1000),

        });

        await sendMail(email, "Verify Your Account", `Your OTP is ${otp}`);


        sendToken(res, user, 200, "OTP send to your Email Please verify your Account")


    } catch (error) {
        res.status(500).json({ success: false, message: error.message })
    }
}


export const verify = async (req, res) => {
    try {

        const otp = Number(req.body.otp);

        const user = await User.findById(req.user._id)

        if (user.otp !== otp || user.otp_expiry < Date.now()) {
            return res.status(400).json({ success: false, message: "Invalid OTP or has been Expired" })
        }

        user.verified = true;
        user.otp = null;
        user.otp_expiry = null;

        await user.save();

        sendToken(res, user, 201, "Account Verified");

    } catch (error) {
        res.status(500).json({ success: false, message: error.message })
    }
}


export const login = async (req, res, next) => {

    try {


        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, message: "Please Enter Password And Email" })
        }

        let user = await User.findOne({ email }).select("+password");

        if (!user) {
            return res.status(400).json({ success: false, message: "Invalid Email or Password" });
        }

        const isMatch = await user.comparePassword(password)

        if (!isMatch) {
            res.status(201).json({ success: false, message: "Invalid Password" })
        }




        sendToken(res, user, 200, "Login Succesfully")


    } catch (error) {
        res.status(500).json({ success: false, message: error.message })
    }
}


export const logout = async (req, res, next) => {
    try {
        res.status(200).cookie("token", null, {
            expires: new Date(Date.now())
        }).json({ success: true, message: "Logged Out Successfully" })


    } catch (error) {
        res.status(500).json({ success: false, message: error.message })
    }
}


export const addTask = async (req, res, next) => {
    try {

        const { title, description } = req.body;

        const user = await User.findById(req.user._id);

        user.tasks.push({ title, description, completed: false, createdAt: new Date(Date.now()) })

        await user.save();

        res.status(200).json({ success: true, message: "Task Added Succesfully" })


    } catch (error) {
        res.status(500).json({ success: false, message: error.message })
    }
}
export const removeTask = async (req, res, next) => {
    try {

        const { taskId } = req.params;

        const user = await User.findById(req.user._id);

        user.tasks = user.tasks.filter((task) => task._id.toString() !== taskId.toString())

        res.status(200).json({ success: true, message: "Task Deleted Succesfully" })

        await user.save();
    } catch (error) {
        res.status(500).json({ success: false, message: error.message })
    }

}
export const updateTask = async (req, res) => {
    try {

        const { taskId } = req.params;

        const user = await User.findById(req.user._id);

        user.task = user.tasks.find((task) => task._id.toString() === taskId.toString());
        user.task.completed = !user.task.completed;

        await user.save();

        res.status(200).json({ success: true, message: "Task Updated Succesfully" })


    } catch (error) {
        res.status(500).json({ success: false, message: error.message })
    }

}

export const getmyProfile = async (req, res, next) => {
    try {

        const user = await User.findById(req.user._id);

        sendToken(res, user, 200, `Welcome Back ${user.name}`)


    } catch (error) {
        res.status(500).json({ success: false, message: error.message })
    }
}

export const updateProfile = async (req, res, next) => {
    try {

        const user = await User.findById(req.user._id);

        const { name } = req.body;
        const avatar = req.files.avatar.tempFilePath;

        if (name) {
            user.name = name;
        }

        if (avatar) {

            await cloudinary.v2.uploader.destroy(user.avatar.public_id);

            const myUpLoad = await cloudinary.v2.uploader.upload(avatar);
            fs.rmSync("./tmp", { recursive: true });

            user.avatar ={
                public_id: myUpLoad.public_id,
                url: myUpLoad.secure_url,
            }


        }
        await user.save();

        res.status(200).json({ success: true, Message: "Name Updated Successfully" });


    } catch (error) {
        res.status(500).json({ success: false, message: error.message })
    }
}

export const updatePassword = async (req, res, next) => {
    try {

        const user = await User.findById(req.user._id).select("+password");

        const { oldPassword, newPassword } = req.body;

        if (!oldPassword || !newPassword) {
            return res.status(404).json({ success: false, message: "Fill All the fields" })
        }

        const isMatch = await user.comparePassword(oldPassword);


        if (!isMatch) {
            return res.status(400).json({ success: false, message: "Invalid Old Password" })

        }

        user.password = newPassword;

        await user.save();



        res.status(200).json({ success: true, Message: "Password Updated Successfully" });


    } catch (error) {
        res.status(500).json({ success: false, message: error.message })
    }
}


export const forgetPassword = async (req, res, next) => {
    try {


        const { email } = req.body;

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(400).json({ success: false, message: "User Not found" })
        }

        const otp = 123456;

        user.resetPasswordOTP = otp;
        user.resetPasswordOTPExpiry = new Date(Date.now() + 5 * 60 * 1000)

        await user.save();


        await sendMail(email, "Request For Reseting Password", `Your OTP is ${otp}`);


        sendToken(res, user, 200, `OTP send to ${email}`)




        res.status(200).json({ success: true, Message: "Password Changed Successfully" });


    } catch (error) {
        res.status(500).json({ success: false, message: error.message })
    }
}

export const resetPassword = async (req, res, next) => {
    try {


        const { otp, newPassword } = req.body;

        const user = await User.findOne({ resetPasswordOTP: otp, resetPasswordOTPExpiry: { $gt: Date.now() } }).select("+password");

        if (!user) {
            return res.status(400).json({ success: false, message: "Otp Invalid or has been Expired" })
        }

        user.password = newPassword;
        user.resetPasswordOTP = null;
        user.resetPasswordOTPExpiry = null;




        await user.save();
        res.status(200).json({ success: true, Message: "Password Changed Successfully" });


    } catch (error) {
        res.status(500).json({ success: false, message: error.message })
    }
}